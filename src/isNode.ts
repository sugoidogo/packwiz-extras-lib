// Source - https://stackoverflow.com/a/31090240
// Posted by Tero Tolonen, modified by community. See post 'Timeline' for change history
// Retrieved 2025-11-28, License - CC BY-SA 4.0

const isNode = new Function("try {return this===global;}catch(e){return false;}")() as boolean

export default isNode
