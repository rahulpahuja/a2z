# Product Requirements Document (PRD) — A2Z Collection

## 1. Executive Summary
A2Z Collection is a high-fashion modern Indian apparel e-commerce platform. This document outlines the functional and non-functional requirements for store policies, administrative configuration controls, and product catalog listing and filtering tools.

---

## 2. Super User Policy Provision & Store Policies

### 2.1 Admin Provision to Alter Refund Policy
- **Access Route:** `/super/settings` (Super User Store Settings)
- **Capability:** Super Users are provided with a dedicated administrative control block to view, alter, save, and reset the store's **Refund & Return Policy**.
- **Persistence:** Saved policies are persisted to Firebase Realtime Database at path `settings/store/refundPolicy` (with fallback to `localStorage` when offline).
- **Reset to Default:** Super Users can restore the default canonical policy at any time via a "Reset to Default Policy" action.

### 2.2 Core Policy Terms & Conditions
The canonical store policy published across `/refund-policy`, `/return-exchange-policy`, and the `/faqs` Help Center enforces the following mandatory provisions:

1. **No Returns & No Exchanges Policy:**
   - A2Z Collection sells quality products and operates under a strict **No Returns & No Exchanges** policy.
   - Strictly no returns or exchanges are accepted under any circumstances — **even if a customer receives a faulty or defective product**.
2. **Order Cancellation:**
   - There is strictly **no provision for order cancellation** once an order has been placed.
3. **Delivery & Courier Reattempts:**
   - In the event of a missed delivery, reattempts will be made by our courier partner.
   - Customers unable to receive the parcel directly may arrange for it to be accepted at a neighbor's address or by someone nearby.
4. **Returned Parcels & Resend Charges:**
   - If a parcel cannot be delivered and is returned to A to Z Collection, the customer may request a parcel resend.
   - All resend shipping/courier charges must be borne by the customer.
   - A to Z Collection is not liable for customer non-receipt of orders.
5. **Non-Refundability:**
   - Money will not be returned under any condition due to the strict No Returns & No Exchanges policy.

---

## 3. Product Listing Page & Catalog Filtering

### 3.1 Top Counter ("Showing X of Y products")
- **Placement:** Positioned prominently at the top of the product listing page (`/products`), in both the primary header toolbar and above the product grid.
- **Specification:** Displays a real-time counter formatted as:
  $$\text{Showing } X \text{ of } Y \text{ products}$$
  - **$X$:** Total number of product cards currently visible on screen (accounting for pagination / lazy-loading batch size).
  - **$Y$:** Total number of products existing in that specific list (after applying active category, subcategory, gender, price, color, and size filters).

### 3.2 Gender Filter (Left-Hand Sidebar)
- **Placement:** Integrated into the left-hand filter sidebar on the product listing page.
- **Filter Options:**
  - `All` (Default)
  - `Male` (Matches Male / Men items)
  - `Female` (Matches Female / Women items)
  - `Unisex` (Matches Unisex items)
- **Behavior:** Dynamically filters catalog items and updates active filter chips above the grid.

### 3.3 Dual Low/High Price Range Filter
- **Placement:** Integrated into the left-hand filter sidebar on the product listing page.
- **Range Controls:**
  - **Low Price (Min):** User-adjustable via range slider and numeric input field (₹).
  - **High Price (Max):** User-adjustable via range slider and numeric input field (₹).
- **Dynamic Limits:** Automatically calculates minimum and maximum catalog prices from active product data.
- **Filtering Logic:** Filters products satisfying $\text{Min Price} \le \text{Product Price} \le \text{Max Price}$.

---

## 4. Technical Specifications & File Map

| Feature | Target File(s) | Description |
| :--- | :--- | :--- |
| Store Settings & Policy State | `src/services/storeSettings.js` | Exports `DEFAULT_REFUND_POLICY`, merges default settings. |
| Super User Admin Editor | `src/pages/admin/AdminSettingsPage.jsx` | Textarea editor & reset trigger for Super Users on `/super/settings`. |
| Public Refund Policy Page | `src/pages/RefundPolicyPage.jsx` | Dynamic subscriber to store settings; renders banner & policy sections. |
| Return & Exchange Policy Page | `src/pages/ReturnExchangePolicyPage.jsx` | Aligned text stating No Returns & No Exchanges even for faulty items. |
| FAQ & Help Center Page | `src/pages/FAQPage.jsx` | Updated FAQ answers regarding returns, exchanges, and cancellations. |
| Product Listing & Filtering | `src/pages/ProductListingPage.jsx` | Includes top $X$ of $Y$ counter, Gender filter, and Dual Price filter. |

---

## 5. Verification & Compliance
- **Unit Testing:** Vitest test suite (`npm test`) verified passing.
- **Production Build:** Production bundle (`npm run build`) verified clean without errors.
