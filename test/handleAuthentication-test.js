import {expect} from 'chai'

import Firebase from 'firebase'
import handleAuthentication from '../src/handleAuthentication'

let {
  authWithPassword, authWithCustomToken, authAnonymously,
  authWithOAuthPopup, authWithOAuthToken, unauth,
} = Firebase.prototype


describe(`HandleAuthentication`, () => {

  it(`should log me out when passing null`, () => {
    expect(handleAuthentication(null)).to.eql([unauth])
  })

  it(`should, if not passed null, require a type`, () => {
    expect(() => {
      handleAuthentication({})
    }).to.throw(`Type is required`)
  })

  it(`should throw on unknown type`, () => {
    expect(() => {
      handleAuthentication({ type: `something_very_unknown` })
    }).to.throw(`Unknown 'type'`)
  })


  it(`should throw when passed in primitives`, () => {
    expect(() => {
      handleAuthentication(undefined)
    }).to.throw(`expects a object or null`)

    expect(() => {
      handleAuthentication(123)
    }).to.throw(`expects a object or null`)

    expect(() => {
      handleAuthentication(Symbol())
    }).to.throw(`expects a object or null`)
  })

  describe(`email/password`, () => {
    it(`should log in using email/password combi`, () => {
      expect(handleAuthentication({
        type: `password`,
        email: `user@name.com`,
        password: `asdf`,
      })).to.eql([authWithPassword, {
        email: `user@name.com`,
        password: `asdf`,
      }])
    })

    it(`should create *and* log in using email/password/create:true combi`, () => {
      // Can't check here for an existing method, so just check the second arg
      let result = handleAuthentication({
        type: `password`,
        email: `user@name.com`,
        password: `asdf`,
        create: true,
      })
      expect(result[1]).to.eql({
        email: `user@name.com`,
        password: `asdf`,
      })
    })

    it(`should error when omitting username`, () => {
      expect(() => {
        handleAuthentication({
          type: `password`,
          password: `asdf`,
        })
      }).to.throw(`username string is required`)
    })

    it(`should error when omitting password`, () => {
      expect(() => {
        handleAuthentication({
          type: `password`,
          email: `user@name.com`,
        })
      }).to.throw(`password string is required`)
    })
  })

  describe(`Custom token`, () => {
    it(`should log in using custom token`, () => {
      expect(handleAuthentication({
        type: `token`,
        token: `asdf`,
      })).to.eql([authWithCustomToken, `asdf`])
    })

    it(`should error when omitting token`, () => {
      expect(() => {
        handleAuthentication({
          type: `token`,
        })
      }).to.throw(`token string is required`)
    })
  })

  describe(`Anonymous`, () => {
    it(`should log in anonymously`, () => {
      expect(handleAuthentication({
        type: `anonymously`,
      })).to.eql([authAnonymously])
    })
    // Has no edge cases... 😂
  })

  describe(`OAuth Popup`, () => {
    it(`should log in anonymously`, () => {
      expect(handleAuthentication({
        type: `oauth_popup`,
        provider: `acme`,
      })).to.eql([authWithOAuthPopup, `acme`])
    })

    it(`should error when omitting provider`, () => {
      expect(() => {
        handleAuthentication({
          type: `oauth_popup`,
        })
      }).to.throw(`provider string is required`)
    })
  })

  describe(`OAuth Token`, () => {
    it(`should log in anonymously`, () => {
      expect(handleAuthentication({
        type: `oauth_token`,
        provider: `acme`,
        token: `asdf`,
      })).to.eql([authWithOAuthToken, `acme`, `asdf`])
    })

    it(`should error when omitting provider`, () => {
      expect(() => {
        handleAuthentication({
          type: `oauth_token`,
          token: `asdf`,
        })
      }).to.throw(`provider string is required`)
    })

    it(`should error when omitting token`, () => {
      expect(() => {
        handleAuthentication({
          type: `oauth_token`,
          provider: `acme`,
        })
      }).to.throw(`token string or object is required`)
    })
  })
})
