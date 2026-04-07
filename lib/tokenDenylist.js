// In-memory token denylist for logout invalidation.
// Resets on server restart — sufficient for single-server deployment.
// Replace with Redis if multi-instance or persistence is needed.
const denylist = new Set();

module.exports = {
  add: (token) => denylist.add(token),
  has: (token) => denylist.has(token),
};
