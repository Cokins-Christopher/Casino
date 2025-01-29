import random

# Define card values for Blackjack
CARD_VALUES = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
    "J": 10, "Q": 10, "K": 10, "A": 11  # Ace can be 1 or 11 (handled in hand calculation)
}

# Create a deck with 6 decks (312 cards)
def create_deck():
    suits = ["♠", "♥", "♦", "♣"]
    deck = [{"rank": rank, "suit": suit, "value": CARD_VALUES[rank]} for rank in CARD_VALUES for suit in suits] * 6
    random.shuffle(deck)
    return deck

# Calculate hand value (handling Aces as 1 or 11)
def calculate_hand_value(hand):
    value = sum(card["value"] for card in hand)
    aces = sum(1 for card in hand if card["rank"] == "A")

    while value > 21 and aces:
        value -= 10  # Convert Ace from 11 to 1
        aces -= 1

    return value

# Check if a hand is Blackjack (Ace + 10-card)
def is_blackjack(hand):
    return len(hand) == 2 and calculate_hand_value(hand) == 21

# Deal initial hands
def deal_initial_hands(deck, num_hands=1):
    player_hands = {f"hand_{i+1}": [deck.pop(), deck.pop()] for i in range(num_hands)}
    dealer_hand = [deck.pop(), deck.pop()]
    return player_hands, dealer_hand
