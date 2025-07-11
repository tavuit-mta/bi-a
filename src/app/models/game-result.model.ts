export interface PenaltyDetail {
  payerId: number;      // Who paid the penalty
  amount: number;       // How much was paid
  receiverId: number;   // Who received the penalty
}

export interface GameResult {
  nPlayers: number;         // Number of players in this game
  players: { id: number; name: string }[]; // List of players for this game
  winnerId: number;         // Winner's player id
  scores: number[];         // Regular scores, order matches players array
  commonPoints: number[];   // Common point value per player (order matches players)
  penalties: PenaltyDetail[]; // Penalty point configuration for this game
  remainingPoints: number[]; // Remaining points after penalties, order matches players array
}
