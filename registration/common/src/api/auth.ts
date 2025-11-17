import { action, makeAutoObservable, observable, when } from "mobx"
import { AuthAPI } from "./types.js"
import { FetchLike, WretchResponse } from "wretch"
import {
  Token,
  listenTokenUpdate,
  loadToken,
  makeTokenFromResponse,
  saveToken,
} from "./token.js"

const RETURN_URL_STORAGE_KEY = "oes-return-url"
const WEBAUTHN_CREDENTIAL_ID_LOCAL_STORAGE_KEY = "oes-credential-id-v1"

/**
 * Holds auth related state.
 */
export class AuthStore {
  private currentToken: Token | null = null
  private currentRefreshOperation: Promise<Token | null> | null = null

  /**
   * A promise that resolves when auth setup is complete.
   */
  readonly ready: Promise<void>

  private _isReady = false

  constructor(
    private api: AuthAPI,
    private origin: string,
  ) {
    makeAutoObservable<this, "currentToken">(this, {
      currentToken: observable.ref,
    })
    this.ready = when(() => this._isReady)
    listenTokenUpdate(
      action((token) => {
        this.currentToken = token
        if (token) {
          this._isReady = true
        }
      }),
    )
  }

  /**
   * The current access token.
   */
  get token(): Token | null {
    return this.currentToken
  }

  /**
   * Whether auth setup is complete.
   */
  get isReady(): boolean {
    return this._isReady
  }

  /**
   * Attempt to load a token from storage.
   */
  async loadToken(): Promise<Token | null> {
    const token = loadToken()
    if (token && !token.getIsExpired()) {
      this.currentToken = token
      this._isReady = true
      return token
    } else if (!token) {
      return null
    } else if (token.refreshToken) {
      const refreshed = await refresh(this.api, token)
      if (refreshed) {
        this.setToken(refreshed)
        return refreshed
      } else {
        return null
      }
    } else {
      return null
    }
  }

  /**
   * Create a new anonymous refresh token.
   */
  async createToken(): Promise<Token> {
    const resp = await this.api.createNewToken()
    const token = makeTokenFromResponse(resp)
    this.setToken(token)
    return token
  }

  /**
   * Sets the auth token.
   */
  setToken(token: Token | null) {
    this.currentToken = token
    if (token) {
      this._isReady = true
      saveToken(token)
    }
  }

  /**
   * Clear the saved token.
   */
  forgetToken() {
    saveToken(null)
  }

  set returnURL(url: string | null) {
    if (url) {
      window.sessionStorage.setItem(RETURN_URL_STORAGE_KEY, url)
    } else {
      window.sessionStorage.removeItem(RETURN_URL_STORAGE_KEY)
    }
  }

  /**
   * The URL to return to after auth.
   */
  get returnURL(): string | null {
    return window.sessionStorage.getItem(RETURN_URL_STORAGE_KEY) || null
  }

  /**
   * Return to the URL sign in started from.
   */
  navigateToReturnURL(): void {
    const url = this.returnURL
    this.returnURL = null
    window.location.href = url || "/"
  }

  set credentialId(id: string | null) {
    if (id) {
      window.localStorage.setItem(WEBAUTHN_CREDENTIAL_ID_LOCAL_STORAGE_KEY, id)
    } else {
      window.localStorage.removeItem(WEBAUTHN_CREDENTIAL_ID_LOCAL_STORAGE_KEY)
    }
  }

  /**
   * The WebAuthn credential ID.
   */
  get credentialId(): string | null {
    return (
      window.localStorage.getItem(WEBAUTHN_CREDENTIAL_ID_LOCAL_STORAGE_KEY) ||
      null
    )
  }

  /**
   * Get auth middleware.
   */
  authMiddleware = (next: FetchLike): FetchLike => {
    const wrapped = (
      url: string,
      opts: RequestInit,
    ): Promise<WretchResponse> => {
      const urlObj = new URL(url, window.location.href)
      if (urlObj.origin == this.origin) {
        return withWaitReady(this.withRefresh(next), this.ready)(url, opts)
      } else {
        return next(url, opts)
      }
    }
    return wrapped
  }

  /**
   * Decorate a fetch function to attempt refreshing the access token.
   */
  withRefresh = (next: FetchLike): FetchLike => {
    const wrapper = async (
      url: string,
      opts: RequestInit,
    ): Promise<WretchResponse> => {
      await this.currentRefreshOperation

      let retryCount = 0
      for (;;) {
        const usedToken = this.currentToken
        const res = await withAuthHeader(next, usedToken)(url, opts)
        const curToken = this.currentToken
        if (
          res.status != 401 ||
          (!curToken?.refreshToken &&
            curToken?.accessToken == usedToken?.accessToken)
        ) {
          // return if successful, or if refresh is not possible
          return res
        } else {
          if (
            !this.currentRefreshOperation &&
            curToken?.refreshToken &&
            curToken.accessToken == usedToken?.accessToken
          ) {
            // only attempt refresh if there isn't currently one in progress,
            // and the token hasn't been updated
            this.tryRefresh(curToken)
          }

          await this.currentRefreshOperation

          if (!this.currentToken?.accessToken) {
            // return if refresh was unsuccessful
            return res
          }

          // otherwise, retry
          if (retryCount < 3) {
            retryCount += 1
            continue
          } else {
            return res
          }
        }
      }
    }
    return wrapper
  }

  private tryRefresh(curToken: Token): Promise<Token | null> {
    this.currentRefreshOperation = refresh(this.api, curToken)
      .then(
        action((newToken) => {
          this.currentRefreshOperation = null
          const replaced = this.replaceToken(curToken, newToken)
          if (replaced?.accessToken == newToken?.accessToken) {
            saveToken(replaced)
          }
          return replaced
        }),
      )
      .catch(
        action((e) => {
          this.currentRefreshOperation = null
          throw e
        }),
      )
    return this.currentRefreshOperation
  }

  /**
   * Sets the current token without overwriting other updates.
   */
  private replaceToken(
    oldToken: Token | null,
    newToken: Token | null,
  ): Token | null {
    if (!newToken) {
      // clear the token without checking
      this.currentToken = null
      return null
    } else if (
      !this.currentToken ||
      this.currentToken.accessToken == oldToken?.accessToken
    ) {
      // only set the token if it is still the same as the old one
      this.currentToken = newToken
      return newToken
    } else {
      return this.currentToken
    }
  }
}

const refresh = async (
  api: AuthAPI,
  curToken: Token | null,
): Promise<Token | null> => {
  if (!curToken?.refreshToken) {
    return null
  }

  const res = await api.refreshToken(curToken.refreshToken)
  if (!res) {
    return null
  }
  return makeTokenFromResponse(res)
}

/**
 * Decorate a fetch function to wait for the auth store to be ready.
 */
const withWaitReady = (
  next: FetchLike,
  readyPromise: Promise<void>,
): FetchLike => {
  const wrapped = async (
    url: string,
    opts: RequestInit,
  ): Promise<WretchResponse> => {
    await readyPromise
    return await next(url, opts)
  }
  return wrapped
}

/**
 * Decorate a fetch function to set the auth header.
 */
const withAuthHeader = (next: FetchLike, token: Token | null): FetchLike => {
  const wrapped = async (
    url: string,
    opts: RequestInit,
  ): Promise<WretchResponse> => {
    const newOpts = {
      ...opts,
      headers: new Headers(opts.headers),
    }

    if (token?.accessToken) {
      newOpts.headers.set("Authorization", `Bearer ${token.accessToken}`)
    }

    return await next(url, newOpts)
  }
  return wrapped
}
