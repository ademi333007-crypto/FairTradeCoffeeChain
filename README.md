# ☕ FairTradeCoffeeChain

Welcome to **FairTradeCoffeeChain**, a decentralized platform built on the Stacks blockchain to certify and track fair trade coffee from farm to cup, ensuring farmers receive fair wages. This project leverages blockchain technology to provide transparency, prevent fraud, and guarantee ethical practices in the coffee supply chain.

## ✨ Features

- **🌱 Farm Certification**: Certify coffee farms as fair trade compliant.
- **📦 Supply Chain Tracking**: Track coffee batches from farm to consumer with immutable records.
- **💸 Fair Wage Distribution**: Ensure farmers are paid fairly through tokenized payments.
- **✅ Verification System**: Allow consumers and retailers to verify the authenticity and ethical sourcing of coffee.
- **📊 Audit Trail**: Provide a transparent audit trail for all stakeholders.
- **🔄 Dispute Resolution**: Handle disputes over quality or payment fairly via decentralized governance.

## 🛠 How It Works

### For Farmers
- Register as a certified fair trade farm with verified credentials.
- Record coffee batches on the blockchain with details like harvest date and certifications.
- Receive tokenized payments directly, ensuring fair wages.

### For Supply Chain Participants (Roasters, Distributors, Retailers)
- Track coffee batches as they move through the supply chain.
- Verify the fair trade status and origin of each batch.
- Record transactions and quality checks on the blockchain.

### For Consumers
- Scan a QR code on coffee packaging to view the batch’s journey and fair trade certification.
- Verify that farmers were paid fairly for the coffee.

### For Auditors
- Access immutable records to audit fair trade compliance and wage distribution.
- Participate in dispute resolution if issues arise.

## 📜 Smart Contracts

The project consists of 6 Clarity smart contracts, each handling a specific function of the platform:

1. **FarmRegistry**: Manages farm registration and fair trade certification.
2. **BatchTracker**: Tracks coffee batches through the supply chain.
3. **PaymentEscrow**: Handles tokenized payments to ensure fair wages.
4. **VerificationPortal**: Allows stakeholders to verify batch authenticity and fair trade status.
5. **AuditLog**: Maintains an immutable audit trail of all actions.
6. **DisputeResolution**: Facilitates decentralized resolution of disputes.

### 1. FarmRegistry Contract
- **Purpose**: Registers and certifies farms as fair trade compliant.
- **Functions**:
  - `register-farm`: Registers a farm with details (name, location, certifications).
  - `update-certification`: Updates a farm’s fair trade certification status.
  - `get-farm-details`: Retrieves farm information for verification.

### 2. BatchTracker Contract
- **Purpose**: Tracks coffee batches from farm to consumer.
- **Functions**:
  - `create-batch`: Records a new coffee batch (farm ID, harvest date, certifications).
  - `update-batch`: Updates batch status (e.g., roasted, shipped, sold).
  - `get-batch-details`: Retrieves batch history for transparency.

### 3. PaymentEscrow Contract
- **Purpose**: Ensures fair wage payments to farmers via tokenized transactions.
- **Functions**:
  - `deposit-payment`: Locks payment in escrow for a batch.
  - `release-payment`: Releases payment to the farmer upon batch delivery.
  - `refund-payment`: Refunds payment in case of disputes.

### 4. VerificationPortal Contract
- **Purpose**: Allows stakeholders to verify batch authenticity and fair trade status.
- **Functions**:
  - `verify-batch`: Confirms a batch’s origin and fair trade compliance.
  - `verify-payment`: Verifies that farmers were paid fairly for a batch.
  - `get-verification-status`: Returns verification details for consumers.

### 5. AuditLog Contract
- **Purpose**: Maintains an immutable log of all actions for transparency.
- **Functions**:
  - `log-action`: Records actions (e.g., batch creation, payment release) on the blockchain.
  - `get-audit-trail`: Retrieves the audit trail for a batch or farm.
  - `restrict-access`: Limits audit log access to authorized auditors.

### 6. DisputeResolution Contract
- **Purpose**: Handles disputes over quality, payment, or certification.
- **Functions**:
  - `raise-dispute`: Initiates a dispute with details (batch ID, issue description).
  - `vote-on-dispute`: Allows stakeholders to vote on dispute outcomes.
  - `resolve-dispute`: Finalizes the dispute and triggers payments or refunds.

## 🚀 Getting Started

### Prerequisites
- **Stacks Blockchain**: Deploy contracts on the Stacks network.
- **Clarity**: Use the Clarity language for smart contract development.
- **STX Tokens**: Use Stacks’ native token for transactions and payments.
- **Wallet**: A Stacks-compatible wallet (e.g., Hiro Wallet) for interacting with the platform.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/FairTradeCoffeeChain.git
   ```
2. Install dependencies (e.g., Clarity SDK, Stacks CLI).
3. Deploy the smart contracts to the Stacks testnet:
   ```bash
   stacks deploy FarmRegistry.clar
   stacks deploy BatchTracker.clar
   stacks deploy PaymentEscrow.clar
   stacks deploy VerificationPortal.clar
   stacks deploy AuditLog.clar
   stacks deploy DisputeResolution.clar
   ```
4. Configure a frontend (e.g., React app) to interact with the contracts.

### Usage
- **Farmers**: Register your farm using `FarmRegistry` and create batches with `BatchTracker`.
- **Supply Chain Participants**: Update batch statuses and deposit payments via `PaymentEscrow`.
- **Consumers**: Use the `VerificationPortal` to check batch details via a QR code.
- **Auditors**: Access the `AuditLog` to review compliance and resolve disputes with `DisputeResolution`.

## 🧑‍💻 Example Workflow
1. A farmer registers their farm and receives fair trade certification via `FarmRegistry`.
2. The farmer creates a coffee batch with details (harvest date, weight) in `BatchTracker`.
3. A roaster purchases the batch, deposits payment in `PaymentEscrow`, and updates the batch status.
4. The batch moves through distributors and retailers, with each step recorded in `BatchTracker`.
5. A consumer scans a QR code to verify the batch’s fair trade status using `VerificationPortal`.
6. An auditor reviews the process via `AuditLog` and resolves any disputes with `DisputeResolution`.
7. The farmer receives their fair wage payment from `PaymentEscrow`.

## 📚 Clarity Contract Example
Below is a simplified example of the `FarmRegistry` contract in Clarity:

```clarity
(define-data-var farm-counter uint u0)
(define-map farms
  { farm-id: uint }
  { name: (string-ascii 100), location: (string-ascii 100), certified: bool })

(define-public (register-farm (name (string-ascii 100)) (location (string-ascii 100)))
  (let ((farm-id (var-get farm-counter)))
    (map-insert farms { farm-id: farm-id } { name: name, location: location, certified: false })
    (var-set farm-counter (+ farm-id u1))
    (ok farm-id)))

(define-public (update-certification (farm-id uint) (certified bool))
  (match (map-get? farms { farm-id: farm-id })
    farm
    (begin
      (map-set farms { farm-id: farm-id } (merge farm { certified: certified }))
      (ok true))
    (err u404)))

(define-read-only (get-farm-details (farm-id uint))
  (map-get? farms { farm-id: farm-id }))
```

## 🌍 Impact
- **Transparency**: Consumers can trust the coffee they buy is ethically sourced.
- **Fair Wages**: Farmers are guaranteed fair compensation through secure payments.
- **Fraud Prevention**: Immutable records prevent counterfeit coffee or false fair trade claims.
- **Global Reach**: The platform supports small-scale farmers in developing countries, promoting economic equity.

## 🛠 Future Enhancements
- Integrate IoT devices to automatically record batch data (e.g., temperature, weight).
- Add a consumer rewards system for purchasing verified fair trade coffee.
- Expand to other fair trade products like tea or cocoa.
