import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import CustomUser, BlackjackGame
from .utils import create_deck, calculate_hand_value, is_blackjack, deal_initial_hands

@csrf_exempt
def start_blackjack(request):
    """Starts a new Blackjack game using session authentication."""
    user_id = request.session.get("user_id") or request.session.get("_auth_user_id")

    if not user_id:
        return JsonResponse({"error": "User not logged in"}, status=401)

    try:
        user = CustomUser.objects.get(id=user_id)
        data = json.loads(request.body)
        bets = data.get("bets", {})

        if not bets:
            return JsonResponse({"error": "No bets placed."}, status=400)

        total_bet = sum(bets.values())
        if user.balance < total_bet:
            return JsonResponse({"error": "Insufficient balance."}, status=400)

        user.balance -= total_bet
        user.save()

        deck = create_deck()
        player_hands, dealer_hand = deal_initial_hands(deck, num_hands=len(bets))

        # Store game in database
        game = BlackjackGame.objects.create(
            user=user,
            deck=deck,
            player_hands=player_hands,
            dealer_hand=dealer_hand,
            bets=bets,
            current_spot=list(player_hands.keys())[0]
        )

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

    if not user_id:
        return JsonResponse({"error": "User not logged in"}, status=401)

    try:
        user = CustomUser.objects.get(id=user_id)
        game = BlackjackGame.objects.filter(user=user).latest("created_at")

        dealer_hand = game.dealer_hand
        deck = game.deck
        player_hands = game.player_hands
        bets = game.bets

        # Dealer only draws cards if at least one player hand is not busted
        any_valid_hand = False
        for hand in player_hands.values():
            if calculate_hand_value(hand) <= 21:
                any_valid_hand = True
                break

        # Reveal hidden card
        dealer_value = calculate_hand_value(dealer_hand)

        # Dealer hits on 16 or less (only if player has a valid hand)
        if any_valid_hand:
            while dealer_value < 17:
                dealer_hand.append(deck.pop())
                dealer_value = calculate_hand_value(dealer_hand)

        results = {}
        payouts = 0

        for spot, player_hand in player_hands.items():
            player_value = calculate_hand_value(player_hand)

            if player_value > 21:
                results[spot] = "Bust ❌"
            elif dealer_value > 21:
                results[spot] = "Win 🏆"  # Dealer busts, player wins
                payouts += bets[spot] * 2
            elif player_value > dealer_value:
                results[spot] = "Win 🏆"  # Player has higher value
                payouts += bets[spot] * 2
            elif player_value < dealer_value:
                results[spot] = "Loss ❌"  # Dealer has higher value
            else:
                results[spot] = "Push 🔄"  # Tie, bet returned
                payouts += bets[spot]

        user.balance += payouts
        user.save()

        game.delete()  # Remove game from DB after completion

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
        return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)
