import {expect} from 'chai'

import getChanges from '../src/getChanges'


describe(`GetChanges`, () => {

  // Testing if it picks up changes
  it(`should see a transformation on the root`, () => {
    let changes = getChanges(1, 2)

    expect(changes).to.eql([{
      location: ``, value: 2,
    }])
  })

  it(`should see a removal on a propertie`, () => {
    let changes = getChanges({ value: 1 }, { value: null })

    expect(changes).to.eql([{
      location: `value`, value: null,
    }])
  })

  it(`should see a number transformation on a propertie`, () => {
    let changes = getChanges({ value: 1 }, { value: 2 })

    expect(changes).to.eql([{
      location: `value`, value: 2,
    }])
  })

  it(`should see a string transformation on a propertie`, () => {
    let changes = getChanges({ value: `one` }, { value: `two` })

    expect(changes).to.eql([{
      location: `value`, value: `two`,
    }])
  })

  it(`should see a boolean transformation on a propertie`, () => {
    let changes = getChanges({ value: false }, { value: true })

    expect(changes).to.eql([{
      location: `value`, value: true,
    }])
  })

  it(`should see deep object, partial change`, () => {
    let changes = getChanges({
      deep: { one: 1, two: 2 },
    }, {
      deep: { one: 1, two: 4 },
    })

    expect(changes).to.eql([{
      location: `deep/two`, value: 4,
    }])
  })

  it(`should see object, partial change`, () => {
    let changes = getChanges({ one: 1, two: 2 }, { one: 1, two: 4 })

    expect(changes).to.eql([{
      location: `two`, value: 4,
    }])
  })

  it(`should allow multiple changes`, () => {
    let changes = getChanges({ one: 1, two: 2 }, { one: 3, two: 4 })

    expect(changes).to.eql([
      { location: `one`, value: 3 },
      { location: `two`, value: 4 },
    ])
  })


  // Testing if it also recognizes things that stay the same
  it(`should see root is the same`, () => {
    let changes = getChanges(1, 1)
    expect(changes).to.eql([])
  })

  it(`should see $set objects references are the same`, () => {
    let object = { value: 1 }
    let changes = getChanges({ $set: object }, { $set: object })
    expect(changes).to.eql([])
  })

  it(`should see numbers are the same`, () => {
    let changes = getChanges({ value: 1 }, { value: 1 })
    expect(changes).to.eql([])
  })

  it(`should see strings are the same`, () => {
    let changes = getChanges({ value: `one` }, { value: `one` })
    expect(changes).to.eql([])
  })

  it(`should see empty strings are the same`, () => {
    let changes = getChanges({ value: `` }, { value: `` })
    expect(changes).to.eql([])
  })

  it(`should see false's are the same`, () => {
    let changes = getChanges({ value: false }, { value: false })
    expect(changes).to.eql([])
  })

  it(`should see true's are the same`, () => {
    let changes = getChanges({ value: true }, { value: true })
    expect(changes).to.eql([])
  })

  it(`should see deep properties are the same`, () => {
    let changes = getChanges({
      deep1: { deep2: { deep3: true }},
    }, {
      deep1: { deep2: { deep3: true }},
    })

    expect(changes).to.eql([])
  })

  // Errors
  it(`should disallow undefined`, () => {
    expect(() => {
      getChanges({}, undefined)
    }).to.throw(/undefined found/i)
  })

  it(`should disallow nested undefined`, () => {
    expect(() => {
      getChanges({}, { value: undefined })
    }).to.throw(/undefined found/i)
  })

  it(`should disallow empty object`, () => {
    expect(() => {
      getChanges({}, {})
    }).to.throw(/empty object/i)
  })

  it(`should disallow nested empty object`, () => {
    expect(() => {
      getChanges({}, { value: {} })
    }).to.throw(/empty object/i)
  })

  // $set error checking
  it(`should disallow $set with more keys`, () => {
    expect(() => {
      getChanges({}, { $set: 4, value: 5 })
    }).to.throw(/\$set/i)
  })

  it(`should disallow $set with undefined`, () => {
    expect(() => {
      getChanges({}, { $set: undefined })
    }).to.throw(/undefined found/i)
  })

  it(`should disallow $set with empty object`, () => {
    expect(() => {
      getChanges({}, { $set: {} })
    }).to.throw(/empty object/i)
  })
})
