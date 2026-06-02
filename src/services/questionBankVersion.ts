function tagVersion(tag: string): number[] {
  const version = tag.match(/(\d+(?:\.\d+){1,3})/)?.[1] ?? tag
  return version.split('.').map((item) => Number(item) || 0)
}

export function compareQuestionBankTags(first: string, second: string): number {
  const left = tagVersion(first)
  const right = tagVersion(second)
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0)
    if (delta !== 0) return delta
  }
  return first.localeCompare(second)
}
