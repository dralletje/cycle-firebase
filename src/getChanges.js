// Get a list of actions necesarry to mirror the change between
// two objects as {location: String, value: Any}
// The absense of data doesn't indicate removal, it indicates
// the data is no longer interesting, so we don't act on that.
// For removal, we use a `value` of `null`

let emptyObjectError = () => {
  return new Error(`Encountered an empty object, this will translate
    into null on firebase, so use null instead to prevent confusing.
  `)
}

let getChanges = (prev, next, path = []) => {
  // Because it's used all over, we just transform
  // the path array into a string directly
  let location = path.join(`/`)

  // Undefined somewhere in the tree is always a mistake
  if (next === undefined) {
    throw new Error(`Undefined found at '${location}' in firebase tree!`)
  }

  // Set returns a description of the change, in an one-element array,
  // which is then executed by the code in .subscribe
  let set = value => {
    return [{location, value}]
  }

  // If the object didn't change... don't update it
  if (prev === next) {
    return []
  }

  // If null... set it to null!
  if (next === null) {
    return set(null)
  }

  // If it is an object, compare deeper!
  if (typeof next === `object`) {
    let keys = Object.keys(next)

    // Empty objects are a mistake, should use null instead
    if (keys.length === 0) {
      throw emptyObjectError()
    }

    // It's an object that looks like { $set: value },which will overwrite
    // the value in it, rather than deep merging it!
    if (typeof next.$set !== `undefined`) {
      // Make sure though, it's the only key:
      if (keys.length !== 1) {
        throw new Error(`Encountered object with key $set, but also others keys at '${location}'!`)
      }
      // Disallow empty objects, even in $set
      if (typeof next.$set === `object` && next.$set !== null && Object.keys(next.$set).length === 0) {
        throw emptyObjectError()
      }
      // If the objects are the same, we don't update
      if (prev && prev.$set === next.$set) {
        return []
      }
      // And return a set operation with the value exact of next.$set
      return set(next.$set)

    // If not, just go and update it deeply
    } else {
      // Find changes inside the object, comparing the previous value
      // at this position (whether it is an object or not) to the current
      // value, which is guaranteed an object.
      let changes = keys.map(key => {
        let prevValue = prev[key] !== undefined ? prev[key] : {}
        return getChanges(prevValue, next[key], path.concat([key]))
      })
      // Because getChanges returns an array of actions to take,
      // `changes` will be :: [ [Action] ], so we have to flatten it,
      // And then just return it
      return [].concat(...changes)
    }
  }

  // If it is a plain value, set it to that value
  return set(next)
}

export default getChanges
