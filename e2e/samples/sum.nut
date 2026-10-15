let { log } = require("logger.nut")

local function sum(values) {
  local total = 0
  foreach (v in values)
    total += v
  return total
}

log($"sum = {sum([1, 2, 3])}")
