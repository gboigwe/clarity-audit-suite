;; Sample Clarity Contract for Testing
;; This contract intentionally includes some common issues for the analyzer to detect

;; Define a fungible token
(define-fungible-token sample-token u1000000)

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant unused-error (err u102)) ;; This constant is never used

;; Data Maps
(define-map user-balances
  { user: principal }
  { balance: uint, last-update: uint }
)

;; Data Variables
(define-data-var total-users uint u0)
(define-data-var contract-paused bool false)

;; Public Functions
(define-public (transfer-tokens (amount uint) (recipient principal))
  (begin
    (asserts! (not (var-get contract-paused)) (err u103))
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    ;; Unsafe operation - no check if user has enough tokens
    (unwrap! (ft-transfer? sample-token amount tx-sender recipient) (err u104))
    (ok true)
  )
)

(define-public (register-user)
  (let ((current-users (var-get total-users)))
    (begin
      (map-set user-balances { user: tx-sender } { balance: u0, last-update: block-height })
      (var-set total-users (+ current-users u1))
      (ok true)
    )
  )
)

;; Read-Only Functions
(define-read-only (get-user-balance (user principal))
  (default-to { balance: u0, last-update: u0 } 
    (map-get? user-balances { user: user }))
)

(define-read-only (get-total-users)
  (ok (var-get total-users))
)

;; Private Functions
(define-private (update-user-balance (user principal) (new-balance uint))
  (begin
    (map-set user-balances { user: user } 
      { 
        balance: new-balance, 
        last-update: block-height
      }
    )
    (ok true)
  )
)

;; This private function is never called
(define-private (calculate-interest (balance uint))
  (let ((rate u5))
    (/ (* balance rate) u100) ;; Potential division by zero if rate is 0
  )
)

;; Initialize the contract
(begin
  ;; Set some initial state
  (var-set contract-paused false)
  (var-set total-users u0)
)
