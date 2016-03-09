// Login in based on a object describing the `type` and auth info

import Firebase from 'firebase'

let {
  authWithPassword, authWithCustomToken, authAnonymously,
  authWithOAuthPopup, authWithOAuthToken, unauth,
} = Firebase.prototype

let invariant = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

let handleAuthentication = (data) => {
  // data should be an object or null
  // (I know `typeof null === 'object'` but I am still hoping that will be removed in a future version)
  invariant(data === null || typeof data === `object`, `handleAuthentication expects a object or null as argument`)

  // When no data given (explicit), log out
  if (data === null) {
    return [unauth]
  }

  // Type is required
  invariant(typeof data.type === `string`, `Type is required for $auth value`)

  // Login using different types of authentication
  switch (data.type.toLowerCase()) {
  // Using an email/password pair
  case `password`:
    // Check for required parameters
    invariant(typeof data.email === `string`, `For password auth, a username string is required`)
    invariant(typeof data.password === `string`, `For password auth, a password string is required`)
    invariant(typeof data.create === `undefined` || typeof data.create === `boolean`, `For password auth, 'created' should be undefined or boolean`)

    if (!data.create) {
      // Without `create`, just try to log in
      return [authWithPassword, {
        email: data.email,
        password: data.password,
      }]
    } else {
      // With create, we create our own function to apply to the fb ref
      return [function createAndAuthWithPassword(credentials) {
        return (
          // Our function creates the user with the credentials
          this.createUser(credentials)
          // And if that works out, if also authenticates
          .then(() => this.authWithPassword(credentials))
        )
      }, {
        email: data.email,
        password: data.password,
      }]
    }
    break // To keep eslint happy

  // All other 'types' match pretty much exactly to firebase counterparts,
  // we only add some checks here and make the parameters named

  case `token`:
    invariant(typeof data.token === `string`, `For token auth, a token string is required`)
    return [authWithCustomToken, data.token]

  case `anonymously`:
    return [authAnonymously]

  case `oauth_popup`:
    invariant(typeof data.provider === `string`, `For oauth, a provider string is required`)
    return [authWithOAuthPopup, data.provider]

  case `oauth_token`:
    invariant(typeof data.provider === `string`, `For oauth, a provider string is required`)
    invariant(typeof data.token === `string` || typeof data.token === `object`, `For oauth, a token string or object is required`)
    return [authWithOAuthToken, data.provider, data.token]

  default:
    throw new Error(`Unknown 'type' passed to $auth: '${data.type.toLowerCase()}'.`)
  }
}

export default handleAuthentication
