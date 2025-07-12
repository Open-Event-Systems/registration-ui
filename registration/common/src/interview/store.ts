import {
  InterviewResponse,
  InterviewResponseRecord,
  InterviewResponseStore,
  UserResponse,
  makeInterviewResponseStore,
} from "@open-event-systems/interview-lib"

const LOCAL_STORAGE_KEY = "oes-interview-v1"
const SESSION_STORAGE_KEY = "oes-interview-v1"

export class InterviewRecordLocalStorage implements InterviewResponseStore {
  constructor(private store: InterviewResponseStore) {}

  get(state: string): InterviewResponseRecord | null {
    return this.store.get(state)
  }

  add(
    response: InterviewResponse,
    prev?: string | undefined,
  ): InterviewResponseRecord {
    const res = this.store.add(response, prev)
    this.save()
    return res
  }

  saveUserResponse(
    state: string,
    userResponse: UserResponse,
  ): InterviewResponseRecord | null {
    const res = this.store.saveUserResponse(state, userResponse)
    this.save()
    return res
  }

  [Symbol.iterator](): Iterator<InterviewResponseRecord> {
    return this.store[Symbol.iterator]()
  }

  /**
   * Save the records to the store.
   */
  save() {
    const asJson = JSON.stringify(Array.from(this))
    window.localStorage.setItem(LOCAL_STORAGE_KEY, asJson)
  }

  /**
   * Load the records from the storage.
   */
  static load(): InterviewRecordLocalStorage {
    try {
      const jsonStr = window.localStorage.getItem(LOCAL_STORAGE_KEY)
      const loaded = jsonStr ? JSON.parse(jsonStr) : []
      const store = makeInterviewResponseStore(loaded)
      return new InterviewRecordLocalStorage(store)
    } catch (_) {
      return new InterviewRecordLocalStorage(makeInterviewResponseStore())
    }
  }
}

export class InterviewRecordSessionStorage implements InterviewResponseStore {
  constructor(private store: InterviewResponseStore) {}

  get(state: string): InterviewResponseRecord | null {
    return this.store.get(state)
  }

  add(
    response: InterviewResponse,
    prev?: string | undefined,
  ): InterviewResponseRecord {
    const res = this.store.add(response, prev)
    this.save()
    return res
  }

  saveUserResponse(
    state: string,
    userResponse: UserResponse,
  ): InterviewResponseRecord | null {
    const res = this.store.saveUserResponse(state, userResponse)
    this.save()
    return res
  }

  [Symbol.iterator](): Iterator<InterviewResponseRecord> {
    return this.store[Symbol.iterator]()
  }

  /**
   * Save the records to the store.
   */
  save() {
    const asJson = JSON.stringify(Array.from(this))
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, asJson)
  }

  /**
   * Load the records from the storage.
   */
  static load(): InterviewRecordSessionStorage {
    try {
      const jsonStr = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
      const loaded = jsonStr ? JSON.parse(jsonStr) : []
      const store = makeInterviewResponseStore(loaded)
      return new InterviewRecordSessionStorage(store)
    } catch (_) {
      return new InterviewRecordSessionStorage(makeInterviewResponseStore())
    }
  }
}
