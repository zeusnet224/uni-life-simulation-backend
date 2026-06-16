// Do not delete this file before iteration 3
function echo(value) {
  if (typeof value === 'object' && value !== null && value.echo === 'echo') {
    return { error: 'INVALID_ECHO', message: 'Cannot echo an object with the property echo.' };
  }
  return value;
}

export { echo };
