import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import CustomUser, BlackjackGame
from .utils import create_deck, calculate_hand_value, is_blackjack, deal_initial_hands

@csrf_exempt
def start_blackjack(request):
    """Starts a new Blackjack game using session authentication."""
    user_id = request.session.get("user_id") or request.session.get("_auth_user_id")
    print("🔁 Backend /start_blackjack called")
    print("User ID:", user_id)

    if not user_id:
        return JsonResponse({"error": "User not logged in"}, status=401)

    try:
        user = CustomUser.objects.get(id=user_id)
        data = json.loads(request.body)
        bets = data.get("bets", {})
        print("Bets placed:", bets)

        if not bets:
            return JsonResponse({"error": "No bets placed."}, status=400)

        total_bet = sum(bets.values())
        print("Total bet:", total_bet, "User balance:", user.balance)
        if user.balance < total_bet:
            return JsonResponse({"error": "Insufficient balance."}, status=400)

        user.balance -= total_bet
        user.save()

        deck = create_deck()
        player_hands, dealer_hand = deal_initial_hands(deck, num_hands=len(bets))
        print("Initial player hands:", player_hands)
        print("Initial dealer hand:", dealer_hand)

        # Store game in database
        game = BlackjackGame.objects.create(
            user=user,
            deck=deck,
            player_hands=player_hands,
            dealer_hand=dealer_hand,
            bets=bets,
            current_spot=list(player_hands.keys())[0]
        )
        print("Game created with ID:", game.id)

        return JsonResponse({
            "message": "Game started",
            "player_hands": player_hands,
            "dealer_hand": [dealer_hand[0], "Hidden"],
            "bets": bets
        })

    except CustomUser.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)

@csrf_exempt
def process_dealer(request):
    """Handles the dealer's turn and determines game outcome."""
    # Try to get user_id from the custom session variable first, then fall back to standard auth variables
    user_id = request.session.get("current_user_id") or request.session.get("user_id") or request.session.get("_auth_user_id")
    print("🔁 Backend /process_dealer called")
    print("User ID:", user_id)

    if not user_id:
        return JsonResponse({"error": "User not logged in"}, status=401)

    try:
        user = CustomUser.objects.get(id=user_id)
        game = BlackjackGame.objects.filter(user=user).latest("created_at")

        dealer_hand = game.dealer_hand
        deck = game.deck
        player_hands = game.player_hands
        bets = game.bets
        print("Processing dealer for game ID:", game.id)
        print("Current dealer hand:", dealer_hand)
        print("Player hands:", player_hands)
        print("Bets:", bets)

        # Dealer only draws cards if at least one player hand is not busted
        any_valid_hand = False
        for hand in player_hands.values():
            hand_value = calculate_hand_value(hand)
            print(f"Hand value: {hand_value}")
            if hand_value <= 21:
                any_valid_hand = True
                break

        print("Any valid hand not busted:", any_valid_hand)

        # Reveal hidden card
        dealer_value = calculate_hand_value(dealer_hand)
        print("Initial dealer value:", dealer_value)

        # Dealer hits on 16 or less (only if player has a valid hand)
        if any_valid_hand:
            print("Dealer will draw cards if value < 17")
            while dealer_value < 17:
                new_card = deck.pop()
                dealer_hand.append(new_card)
                dealer_value = calculate_hand_value(dealer_hand)
                print(f"Dealer drew {new_card['rank']} of {new_card['suit']}, new value: {dealer_value}")

        results = {}
        payouts = 0

        for spot, player_hand in player_hands.items():
            player_value = calculate_hand_value(player_hand)
            print(f"Spot {spot}: Player value {player_value}, Dealer value {dealer_value}")

            if player_value > 21:
                results[spot] = "Bust ❌"
                print(f"Spot {spot}: Player bust")
            elif dealer_value > 21:
                results[spot] = "Win 🏆"  # Dealer busts, player wins
                payouts += bets[spot] * 2
                print(f"Spot {spot}: Dealer bust, player wins {bets[spot] * 2}")
            elif player_value > dealer_value:
                results[spot] = "Win 🏆"  # Player has higher value
                payouts += bets[spot] * 2
                print(f"Spot {spot}: Player has higher value, wins {bets[spot] * 2}")
            elif player_value < dealer_value:
                results[spot] = "Loss ❌"  # Dealer has higher value
                print(f"Spot {spot}: Dealer has higher value, player loses")
            else:
                results[spot] = "Push 🔄"  # Tie, bet returned
                payouts += bets[spot]
                print(f"Spot {spot}: Push, bet {bets[spot]} returned")

        user.balance += payouts
        user.save()
        print("Total payouts:", payouts, "New balance:", user.balance)

        game.delete()  # Remove game from DB after completion
        print("Game deleted from DB")

        # Clear the custom session variable if it exists
        if "current_user_id" in request.session:
            del request.session["current_user_id"]

        # Ensure the response includes all required fields
        response_data = {
            "message": "Dealer has finished their turn.",
            "dealer_hand": dealer_hand,
            "results": results,
            "new_balance": float(user.balance)  # Ensure balance is returned as a float
        }

        return JsonResponse(response_data)

    except CustomUser.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
    except BlackjackGame.DoesNotExist:
        return JsonResponse({"error": "No active game found."}, status=400)
    except Exception as e:
        # Catch any other unexpected errors
        print(f"❌ Unexpected error in process_dealer: {str(e)}")
        return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)
