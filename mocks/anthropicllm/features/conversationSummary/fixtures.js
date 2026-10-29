/**
 * Conversation Summary (per Conversation Summary.pdf): user text contains
 * `generate summary for` plus transcript; assistant returns markdown in the text block
 * (not JSON-in-fences like DialogGPT).
 *
 * Each row matches when every string in `matchWhenAll` appears in the user message
 * (case-insensitive, whitespace collapsed for comparison).
 */
const fixtures = [
  {
    id: 'call-summary-tata-tiago',
    matchWhenAll: ['itc computers', 'harish', 'tata tiago', 'my name is rao'],
    assistantText: `# Call Summary

**Customer:** Rao

**Agent:** Harish (ITC Computers)

**Purpose:** Vehicle purchase inquiry

## Key Details:
- **Product:** Tata Tiago XZ model
- **Price:** ₹67,900
- **Delivery Time:** 1 month (if ordered within 15 days)
- **Outcome:** Customer expressed intent to order within the specified timeframe

**Status:** Inquiry completed; customer to place order soon`,
  },
  {
    id: 'chat-summary-smartwatch-discard',
    matchWhenAll: ['discard all', 'smartwatch', 'black', 'rs.2000'],
    assistantText: `# Customer Service Chat Summary

**Topic:** Product Inquiry - Smartwatch

**Key Points:**
- Customer initially requested to discard previous conversation (done twice)
- Agent acknowledged and reset the conversation
- Customer inquired about a Smartwatch product
- Customer selected Black color option from available choices (White, Brown, Black)
- **Product Details:** Black Smartwatch priced at Rs. 2,000
- Agent offered additional assistance at the end

**Outcome:** Product information successfully provided. No purchase or further assistance requested.`,
  },
]

module.exports = { fixtures }
