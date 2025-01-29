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
    user_id = request.session.get("user_id") or request.session.get("_auth_user_id")

    if not user_id:
        return JsonResponse({"error": "User not logged in"}, status=401)

    try:
        user = CustomUser.objects.get(id=user_id)
        game = BlackjackGame.objects.filter(user=user).latest("created_at")

        dealer_hand = game.dealer_hand
        deck = game.deck

        # Reveal hidden card
        dealer_value = calculate_hand_value(dealer_hand)

        # Dealer hits on 16 or less
        while dealer_value < 17:
            dealer_hand.append(deck.pop())
            dealer_value = calculate_hand_value(dealer_hand)

        results = {}
        payouts = 0

        for spot, player_hand in game.player_hands.items():
            player_value = calculate_hand_value(player_hand)

            if player_value > 21:
                results[spot] = "Bust ❌"
            elif dealer_value > 21 or player_value > dealer_value:
                results[spot] = "Win 🏆"
                payouts += game.bets[spot] * 2
            elif player_value < dealer_value:
                results[spot] = "Loss ❌"
            else:
                results[spot] = "Push 🔄"
                payouts += game.bets[spot]

        user.balance += payouts
        user.save()

        game.delete()  # Remove game from DB after completion

        return JsonResponse({
            "message": "Dealer has finished their turn.",
            "dealer_hand": dealer_hand,
            "results": results,
            "new_balance": user.balance
        })

    except BlackjackGame.DoesNotExist:
        return JsonResponse({"error": "No active game found."}, status=400)
