;; FarmRegistry.clar
;; Sophisticated Farm Registry Contract for FairTradeCoffeeChain
;; This contract manages farm registrations, fair trade certifications, 
;; certification history, collaborators, farm status, categories, and revenue shares.
;; It ensures robust validation, access control, and immutability for ethical coffee sourcing.

;; Constants
(define-constant ERR-UNAUTHORIZED u100)
(define-constant ERR-ALREADY-REGISTERED u101)
(define-constant ERR-INVALID-DETAILS u102)
(define-constant ERR-NOT-FOUND u103)
(define-constant ERR-INVALID-CERTIFICATION u104)
(define-constant ERR-MAX-COLLABORATORS u105)
(define-constant ERR-INVALID-PERCENTAGE u106)
(define-constant ERR-PAUSED u107)
(define-constant MAX_COLLABORATORS u10)
(define-constant MAX_TAGS u10)
(define-constant MAX_HISTORY_ENTRIES u50)
(define-constant MAX_SHARE_PERCENTAGE u100)

;; Data Variables
(define-data-var contract-admin principal tx-sender)
(define-data-var farm-counter uint u0)
(define-data-var paused bool false)

;; Data Maps
(define-map farms
  { farm-id: uint }
  {
    owner: principal,
    name: (string-utf8 100),
    location: (string-utf8 200),
    registered-at: uint,
    last-updated: uint
  }
)

(define-map certifications
  { farm-id: uint }
  {
    certified: bool,
    certifier: principal,
    certification-level: (string-utf8 50), ;; e.g., "FairTrade Premium", "Organic"
    expiry: uint,
    notes: (string-utf8 500)
  }
)

(define-map certification-history
  { farm-id: uint, entry-id: uint }
  {
    action: (string-utf8 50), ;; e.g., "Certified", "Revoked", "Renewed"
    timestamp: uint,
    performer: principal,
    details: (string-utf8 200)
  }
)

(define-map farm-categories
  { farm-id: uint }
  {
    primary-category: (string-utf8 50), ;; e.g., "Coffee", "Organic Farming"
    tags: (list 10 (string-utf8 20))
  }
)

(define-map collaborators
  { farm-id: uint, collaborator: principal }
  {
    role: (string-utf8 50), ;; e.g., "Manager", "Worker"
    permissions: (list 5 (string-utf8 20)), ;; e.g., "update-details", "certify"
    added-at: uint
  }
)

(define-map farm-status
  { farm-id: uint }
  {
    status: (string-utf8 20), ;; e.g., "Active", "Suspended"
    visibility: bool, ;; Public or private
    last-updated: uint
  }
)

(define-map revenue-shares
  { farm-id: uint, participant: principal }
  {
    percentage: uint,
    total-received: uint,
    last-payout: uint
  }
)

(define-map history-counters
  { farm-id: uint }
  { count: uint }
)

;; Private Functions
(define-private (is-admin (caller principal))
  (is-eq caller (var-get contract-admin))
)

(define-private (is-farm-owner (farm-id uint) (caller principal))
  (match (map-get? farms {farm-id: farm-id})
    farm (is-eq (get owner farm) caller)
    false
  )
)

(define-private (add-history-entry (farm-id uint) (action (string-utf8 50)) (details (string-utf8 200)))
  (let
    (
      (current-count (default-to u0 (get count (map-get? history-counters {farm-id: farm-id}))))
      (new-entry-id (+ current-count u1))
    )
    (if (> new-entry-id MAX_HISTORY_ENTRIES)
      (err ERR-INVALID-DETAILS) ;; Prevent overflow of history
      (begin
        (map-set certification-history
          {farm-id: farm-id, entry-id: new-entry-id}
          {
            action: action,
            timestamp: block-height,
            performer: tx-sender,
            details: details
          }
        )
        (map-set history-counters {farm-id: farm-id} {count: new-entry-id})
        (ok true)
      )
    )
  )
)

;; Public Functions

;; Register a new farm
(define-public (register-farm (name (string-utf8 100)) (location (string-utf8 200)) (primary-category (string-utf8 50)) (tags (list 10 (string-utf8 20))))
  (if (var-get paused)
    (err ERR-PAUSED)
    (let
      (
        (farm-id (+ (var-get farm-counter) u1))
      )
      (if (or (is-eq (len name) u0) (is-eq (len location) u0))
        (err ERR-INVALID-DETAILS)
        (begin
          (map-set farms
            {farm-id: farm-id}
            {
              owner: tx-sender,
              name: name,
              location: location,
              registered-at: block-height,
              last-updated: block-height
            }
          )
          (map-set farm-categories
            {farm-id: farm-id}
            {
              primary-category: primary-category,
              tags: tags
            }
          )
          (map-set farm-status
            {farm-id: farm-id}
            {
              status: u"Pending",
              visibility: true,
              last-updated: block-height
            }
          )
          (try! (add-history-entry farm-id u"Registered" u"Initial farm registration"))
          (var-set farm-counter farm-id)
          (ok farm-id)
        )
      )
    )
  )
)

;; Update farm details (owner only)
(define-public (update-farm-details (farm-id uint) (new-name (string-utf8 100)) (new-location (string-utf8 200)))
  (if (var-get paused)
    (err ERR-PAUSED)
    (match (map-get? farms {farm-id: farm-id})
      farm
      (if (is-farm-owner farm-id tx-sender)
        (begin
          (map-set farms
            {farm-id: farm-id}
            (merge farm {
              name: new-name,
              location: new-location,
              last-updated: block-height
            })
          )
          (try! (add-history-entry farm-id u"Updated Details" u"Changed name and location"))
          (ok true)
        )
        (err ERR-UNAUTHORIZED)
      )
      (err ERR-NOT-FOUND)
    )
  )
)

;; Certify farm (admin or certifier only)
(define-public (certify-farm (farm-id uint) (level (string-utf8 50)) (expiry uint) (notes (string-utf8 500)))
  (if (var-get paused)
    (err ERR-PAUSED)
    (match (map-get? farms {farm-id: farm-id})
      farm
      (if (or (is-admin tx-sender) (is-eq (get owner farm) tx-sender)) ;; For now, allow owner or admin
        (begin
          (map-set certifications
            {farm-id: farm-id}
            {
              certified: true,
              certifier: tx-sender,
              certification-level: level,
              expiry: expiry,
              notes: notes
            }
          )
          (try! (add-history-entry farm-id u"Certified" (concat u"Level: " level)))
          (ok true)
        )
        (err ERR-UNAUTHORIZED)
      )
      (err ERR-NOT-FOUND)
    )
  )
)

;; Revoke certification (admin only)
(define-public (revoke-certification (farm-id uint) (reason (string-utf8 200)))
  (if (var-get paused)
    (err ERR-PAUSED)
    (match (map-get? certifications {farm-id: farm-id})
      cert
      (if (is-admin tx-sender)
        (begin
          (map-set certifications
            {farm-id: farm-id}
            (merge cert {certified: false})
          )
          (try! (add-history-entry farm-id u"Revoked" reason))
          (ok true)
        )
        (err ERR-UNAUTHORIZED)
      )
      (err ERR-NOT-FOUND)
    )
  )
)

;; Add collaborator (owner only)
(define-public (add-collaborator (farm-id uint) (collaborator principal) (role (string-utf8 50)) (permissions (list 5 (string-utf8 20))))
  (if (var-get paused)
    (err ERR-PAUSED)
    (match (map-get? farms {farm-id: farm-id})
      farm
      (if (is-farm-owner farm-id tx-sender)
        (let
          (
            (collab-key {farm-id: farm-id, collaborator: collaborator})
          )
          (if (is-some (map-get? collaborators collab-key))
            (err ERR-ALREADY-REGISTERED)
            (begin
              (map-set collaborators collab-key
                {
                  role: role,
                  permissions: permissions,
                  added-at: block-height
                }
              )
              (try! (add-history-entry farm-id u"Added Collaborator" (concat u"Role: " role)))
              (ok true)
            )
          )
        )
        (err ERR-UNAUTHORIZED)
      )
      (err ERR-NOT-FOUND)
    )
  )
)

;; Update farm status (owner or admin)
(define-public (update-farm-status (farm-id uint) (new-status (string-utf8 20)) (new-visibility bool))
  (if (var-get paused)
    (err ERR-PAUSED)
    (match (map-get? farm-status {farm-id: farm-id})
      status
      (if (or (is-farm-owner farm-id tx-sender) (is-admin tx-sender))
        (begin
          (map-set farm-status
            {farm-id: farm-id}
            {
              status: new-status,
              visibility: new-visibility,
              last-updated: block-height
            }
          )
          (try! (add-history-entry farm-id u"Status Updated" new-status))
          (ok true)
        )
        (err ERR-UNAUTHORIZED)
      )
      (err ERR-NOT-FOUND)
    )
  )
)

;; Set revenue share (owner only)
(define-public (set-revenue-share (farm-id uint) (participant principal) (percentage uint))
  (if (var-get paused)
    (err ERR-PAUSED)
    (match (map-get? farms {farm-id: farm-id})
      farm
      (if (is-farm-owner farm-id tx-sender)
        (if (> percentage MAX_SHARE_PERCENTAGE)
          (err ERR-INVALID-PERCENTAGE)
          (let
            (
              (share-key {farm-id: farm-id, participant: participant})
            )
            (map-set revenue-shares share-key
              {
                percentage: percentage,
                total-received: u0,
                last-payout: u0
              }
            )
            (try! (add-history-entry farm-id u"Set Revenue Share" (concat u"Participant: " (principal-to-string participant))))
            (ok true)
          )
        )
        (err ERR-UNAUTHORIZED)
      )
      (err ERR-NOT-FOUND)
    )
  )
)

;; Admin functions
(define-public (pause-contract)
  (if (is-admin tx-sender)
    (begin
      (var-set paused true)
      (ok true)
    )
    (err ERR-UNAUTHORIZED)
  )
)

(define-public (unpause-contract)
  (if (is-admin tx-sender)
    (begin
      (var-set paused false)
      (ok true)
    )
    (err ERR-UNAUTHORIZED)
  )
)

(define-public (transfer-admin (new-admin principal))
  (if (is-admin tx-sender)
    (begin
      (var-set contract-admin new-admin)
      (ok true)
    )
    (err ERR-UNAUTHORIZED)
  )
)

;; Read-only Functions
(define-read-only (get-farm-details (farm-id uint))
  (map-get? farms {farm-id: farm-id})
)

(define-read-only (get-certification (farm-id uint))
  (map-get? certifications {farm-id: farm-id})
)

(define-read-only (get-certification-history-entry (farm-id uint) (entry-id uint))
  (map-get? certification-history {farm-id: farm-id, entry-id: entry-id})
)

(define-read-only (get-history-count (farm-id uint))
  (default-to u0 (get count (map-get? history-counters {farm-id: farm-id})))
)

(define-read-only (get-farm-categories (farm-id uint))
  (map-get? farm-categories {farm-id: farm-id})
)

(define-read-only (get-collaborator (farm-id uint) (collaborator principal))
  (map-get? collaborators {farm-id: farm-id, collaborator: collaborator})
)

(define-read-only (get-farm-status (farm-id uint))
  (map-get? farm-status {farm-id: farm-id})
)

(define-read-only (get-revenue-share (farm-id uint) (participant principal))
  (map-get? revenue-shares {farm-id: farm-id, participant: participant})
)

(define-read-only (is-contract-paused)
  (var-get paused)
)

(define-read-only (get-contract-admin)
  (var-get contract-admin)
)