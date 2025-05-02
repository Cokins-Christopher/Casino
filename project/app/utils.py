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
    """
    Calculate the total value of a blackjack hand.
    
    Handles different card formats:
    - Cards as dictionaries with 'rank' key (e.g. {'rank': 'A', 'suit': '♥'})
    - Cards as strings (e.g. 'AH', '10C')
    - Nested arrays of cards
    - 'Hidden' placeholder cards
    
    Returns an integer representing the best hand value.
    """
    # IMPORTANT: This function handles nested card structures that caused the TypeError.
    # The hand parameter can sometimes be a list of lists of cards (e.g., [["AH", "2D"], "KS"])
    # which previously caused the error: "list indices must be integers or slices, not str"
    # when the code tried to access attributes like card["value"] on a list.
    # The solution is to flatten the hand structure into a single level before processing.
    
    # Input validation
    if hand is None:
        print("WARNING: calculate_hand_value received None as hand")
        return 0
    
    if not isinstance(hand, list):
        print(f"WARNING: calculate_hand_value expected a list, got {type(hand)}")
        return 0
    
    # Log original hand structure before processing
    print(f"DEBUG: Original hand structure: {hand}")
    
    # Flatten nested hand structure to simplify processing
    # The game sometimes stores hands as nested lists: [[card1, card2], card3]
    flattened_hand = []
    for item in hand:
        if isinstance(item, list):
            # Handle nested list by adding each card within it
            flattened_hand.extend(item)
        else:
            # Add regular cards directly
            flattened_hand.append(item)
            
    print(f"DEBUG: Flattened hand ({len(flattened_hand)} cards): {flattened_hand}")
    
    value = 0
    aces = 0
    
    # Process each card in the flattened hand
    for card in flattened_hand:
        # Skip None or empty values
        if card is None:
            continue
            
        # Skip 'Hidden' placeholder cards    
        if card == 'Hidden':
            continue
            
        # Handle string cards (like 'AH', '10C', etc.)
        if isinstance(card, str):
            # Extract rank from string representation
            if card.startswith('10'):
                rank = '10'
            else:
                rank = card[0]  # First character is the rank
                
            if rank == 'A':
                aces += 1
                value += 11  # Aces start at 11, can be reduced later
            elif rank in ('K', 'Q', 'J'):
                value += 10
            else:
                try:
                    value += int(rank)
                except (ValueError, TypeError):
                    print(f"WARNING: Unable to parse rank value from {card}")
                    
        # Handle dictionary cards            
        elif isinstance(card, dict):
            # Try to get card value using multiple approaches
            if 'rank' in card:
                # Calculate value based on rank
                rank = card['rank']
                if rank == 'A':
                    aces += 1
                    value += 11  # Aces start at 11, can be reduced later
                elif rank in ('K', 'Q', 'J'):
                    value += 10
                else:
                    try:
                        value += int(rank)
                    except (ValueError, TypeError):
                        print(f"WARNING: Unable to parse rank value from {card}")
            elif 'value' in card:
                # Use explicit value if available
                card_value = card['value']
                # Check if this is an ace by its value
                if card_value == 11 and 'rank' in card and card['rank'] == 'A':
                    aces += 1
                    value += 11
                else:
                    value += card_value
            else:
                print(f"WARNING: Card has no 'rank' or 'value' key: {card}")
        else:
            print(f"WARNING: Unrecognized card format: {type(card)} - {card}")
    
    # Adjust for aces (1 or 11)
    while value > 21 and aces > 0:
        value -= 10  # Change one ace from 11 to 1
        aces -= 1
        print(f"DEBUG: Adjusted ace value: value is now {value} with {aces} aces remaining")
        
    print(f"DEBUG: Hand value calculated: {value}")
    return value

# Check if a hand is Blackjack (Ace + 10-card)
def is_blackjack(hand):
    return len(hand) == 2 and calculate_hand_value(hand) == 21

# Deal initial hands
def deal_initial_hands(deck, num_hands=1):
    player_hands = {f"hand_{i+1}": [deck.pop(), deck.pop()] for i in range(num_hands)}
    dealer_hand = [deck.pop(), deck.pop()]
    return player_hands, dealer_hand

# Test cases for calculate_hand_value function
def test_calculate_hand_value():
    """Test the calculate_hand_value function with various input formats."""
    # Test with regular dictionary cards
    hand1 = [
        {"rank": "A", "suit": "♥", "value": 11},
        {"rank": "K", "suit": "♠", "value": 10}
    ]
    assert calculate_hand_value(hand1) == 21, f"Expected 21 for {hand1}, got {calculate_hand_value(hand1)}"
    
    # Test with string cards
    hand2 = ["AH", "KS"]
    assert calculate_hand_value(hand2) == 21, f"Expected 21 for {hand2}, got {calculate_hand_value(hand2)}"
    
    # Test with nested array structure (this was causing the TypeError)
    hand3 = [
        [{"rank": "A", "suit": "♥", "value": 11}],
        [{"rank": "K", "suit": "♠", "value": 10}]
    ]
    assert calculate_hand_value(hand3) == 21, f"Expected 21 for {hand3}, got {calculate_hand_value(hand3)}"
    
    # Test with deeply nested arrays (now correctly flattened)
    hand3a = [
        [{"rank": "A", "suit": "♥", "value": 11}, {"rank": "2", "suit": "♦", "value": 2}],
        {"rank": "K", "suit": "♠", "value": 10}
    ]
    assert calculate_hand_value(hand3a) == 23, f"Expected 23 for {hand3a}, got {calculate_hand_value(hand3a)}"
    
    # Test with mixed formats
    hand4 = [
        {"rank": "A", "suit": "♥", "value": 11},
        "KS"
    ]
    assert calculate_hand_value(hand4) == 21, f"Expected 21 for {hand4}, got {calculate_hand_value(hand4)}"
    
    # Test with 'Hidden' card
    hand5 = [
        {"rank": "A", "suit": "♥", "value": 11},
        "Hidden"
    ]
    assert calculate_hand_value(hand5) == 11, f"Expected 11 for {hand5}, got {calculate_hand_value(hand5)}"
    
    # Test ace handling (switching from 11 to 1)
    hand6 = [
        {"rank": "A", "suit": "♥", "value": 11},
        {"rank": "A", "suit": "♠", "value": 11},
        {"rank": "K", "suit": "♣", "value": 10}
    ]
    assert calculate_hand_value(hand6) == 12, f"Expected 12 for {hand6}, got {calculate_hand_value(hand6)}"
    
    # Test a complex nested structure (like what might appear in player_hands)
    hand7 = [
        [{"rank": "5", "suit": "♠", "value": 5}],
        [{"rank": "J", "suit": "♥", "value": 10}, {"rank": "6", "suit": "♣", "value": 6}]
    ]
    assert calculate_hand_value(hand7) == 21, f"Expected 21 for {hand7}, got {calculate_hand_value(hand7)}"
    
    # Test with multiple aces that need adjustment
    hand8 = [
        {"rank": "A", "suit": "♥", "value": 11},
        {"rank": "A", "suit": "♦", "value": 11},
        {"rank": "A", "suit": "♠", "value": 11},
        {"rank": "8", "suit": "♣", "value": 8}
    ]
    assert calculate_hand_value(hand8) == 21, f"Expected 21 for {hand8}, got {calculate_hand_value(hand8)}"
    
    # Test with aces that would cause a bust if counted as 11
    hand9 = [
        {"rank": "7", "suit": "♣", "value": 7},
        {"rank": "8", "suit": "♣", "value": 8},
        {"rank": "A", "suit": "♦", "value": 11}
    ]
    assert calculate_hand_value(hand9) == 16, f"Expected 16 for {hand9}, got {calculate_hand_value(hand9)}"
    
    # Test with multiple aces where some should be 1 and others 11
    hand10 = [
        {"rank": "A", "suit": "♥", "value": 11},
        {"rank": "A", "suit": "♦", "value": 11},
        {"rank": "9", "suit": "♠", "value": 9}
    ]
    assert calculate_hand_value(hand10) == 21, f"Expected 21 for {hand10}, got {calculate_hand_value(hand10)}"
    
    print("All calculate_hand_value tests passed!")

# Test card rank extraction for splitting
def test_split_rank_extraction():
    """Test rank extraction functionality for different card formats."""
    
    def get_card_rank(card):
        """Extract rank from a card regardless of format."""
        if isinstance(card, dict) and "rank" in card:
            return card["rank"]
        elif isinstance(card, str):
            # Handle string card format (e.g., "AH", "10S")
            if card.startswith('10'):
                return '10'
            else:
                return card[0]  # First character is the rank
        return None
    
    # Dictionary card format
    card1 = {"rank": "J", "suit": "♠", "value": 10}
    card2 = {"rank": "J", "suit": "♥", "value": 10}
    
    # String card format
    card3 = "JC"
    card4 = "JD"
    
    # 10 special case
    card5 = {"rank": "10", "suit": "♣", "value": 10}
    card6 = "10S"
    
    # Mixed formats
    rank1 = get_card_rank(card1)
    rank2 = get_card_rank(card2)
    rank3 = get_card_rank(card3)
    rank4 = get_card_rank(card4)
    rank5 = get_card_rank(card5)
    rank6 = get_card_rank(card6)
    
    # Verify ranks
    print(f"Card ranks extracted: {rank1}, {rank2}, {rank3}, {rank4}, {rank5}, {rank6}")
    
    # Test matching pairs
    assert rank1 == rank2, f"Dictionary cards should match: {rank1} vs {rank2}"
    assert rank3 == rank4, f"String cards should match: {rank3} vs {rank4}"
    assert rank5 == rank6, f"10 cards should match regardless of format: {rank5} vs {rank6}"
    assert rank1 == rank3, f"Dictionary and string cards should match: {rank1} vs {rank3}"
    
    print("All split rank extraction tests passed!")

# Uncomment to run tests
# test_calculate_hand_value()
# test_split_rank_extraction()
