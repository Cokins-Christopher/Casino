import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import CustomUser, BlackjackGame, Transaction
from .utils import create_deck, calculate_hand_value, is_blackjack, deal_initial_hands
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from .authentication import TokenAuthentication
from decimal import Decimal
import datetime

@csrf_exempt
@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def start_blackjack(request):
    """Starts a new Blackjack game using token authentication."""
    # Fixing auth flow: Using request.user.id instead of session checks
    user_id = request.user.id
    print("🔁 Backend /start_blackjack called")
    print("User ID:", user_id)

    try:
        user = request.user
        data = json.loads(request.body)
        bets = data.get("bets", {})
        print("Bets placed:", bets)

        if not bets:
            return JsonResponse({"error": "No bets placed."}, status=400)

        total_bet = sum(bets.values())
        print("Total bet:", total_bet, "User balance:", user.balance)
        if user.balance < total_bet:
            return JsonResponse({"error": "Insufficient balance."}, status=400)

        # Deduct from user balance
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

        # Create a game_bet transaction for stats tracking
        Transaction.objects.create(
            user=user,
            amount=Decimal(str(total_bet)),
            transaction_type="game_bet",  # This will be processed as a "loss" type
            payment_method="game",
            timestamp=datetime.datetime.now(),
            game_id=str(game.id),
            game_type="blackjack"
        )
        print(f"Created game_bet transaction for {total_bet}")

        return JsonResponse({
            "message": "Game started",
            "player_hands": player_hands,
            "dealer_hand": [dealer_hand[0], "Hidden"],
            "bets": bets
        })

    except Exception as e:
        print(f"❌ Error in start_blackjack: {str(e)}")
        return JsonResponse({"error": f"Error: {str(e)}"}, status=500)

@csrf_exempt
@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def process_dealer(request):
    """Handles the dealer's turn and determines game outcome."""
    # Fixing auth flow: Using request.user.id instead of session checks
    user_id = request.user.id
    print("🔁 Backend /process_dealer called")
    print("User ID:", user_id)

    try:
        user = request.user
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
        
        # Track transactions for stats
        total_win_amount = 0
        total_loss_amount = 0
        game_id = str(game.id)

        for spot, player_hand in player_hands.items():
            player_value = calculate_hand_value(player_hand)
            print(f"Spot {spot}: Player value {player_value}, Dealer value {dealer_value}")
            bet_amount = bets[spot]

            if player_value > 21:
                results[spot] = "Bust ❌"
                print(f"Spot {spot}: Player bust")
                # Record loss transaction
                total_loss_amount += bet_amount
            elif dealer_value > 21:
                results[spot] = "Win 🏆"  # Dealer busts, player wins
                win_amount = bet_amount * 2
                payouts += win_amount
                print(f"Spot {spot}: Dealer bust, player wins {win_amount}")
                # Record win transaction
                total_win_amount += win_amount - bet_amount  # Record only the profit
            elif player_value > dealer_value:
                results[spot] = "Win 🏆"  # Player has higher value
                win_amount = bet_amount * 2
                payouts += win_amount
                print(f"Spot {spot}: Player has higher value, wins {win_amount}")
                # Record win transaction
                total_win_amount += win_amount - bet_amount  # Record only the profit
            elif player_value < dealer_value:
                results[spot] = "Loss ❌"  # Dealer has higher value
                print(f"Spot {spot}: Dealer has higher value, player loses")
                # Record loss transaction
                total_loss_amount += bet_amount
            else:
                results[spot] = "Push 🔄"  # Tie, bet returned
                payouts += bet_amount
                print(f"Spot {spot}: Push, bet {bet_amount} returned")
                # No transaction for push - money is returned, not won or lost

        # Update user balance
        user.balance += payouts
        user.save()
        print("Total payouts:", payouts, "New balance:", user.balance)
        
        # Create transactions for stats tracking
        if total_win_amount > 0:
            # Create a win transaction
            Transaction.objects.create(
                user=user,
                amount=Decimal(str(total_win_amount)),
                transaction_type="win",
                payment_method="game",
                timestamp=datetime.datetime.now(),
                game_id=game_id,
                game_type="blackjack"
            )
            print(f"Created win transaction for {total_win_amount}")
            
            # Update last_spin time for the user
            user.last_spin = datetime.datetime.now()
            user.save()
        
        if total_loss_amount > 0:
            # Create a loss transaction
            Transaction.objects.create(
                user=user,
                amount=Decimal(str(total_loss_amount)),
                transaction_type="loss",
                payment_method="game",
                timestamp=datetime.datetime.now(),
                game_id=game_id,
                game_type="blackjack"
            )
            print(f"Created loss transaction for {total_loss_amount}")

        game.delete()  # Remove game from DB after completion
        print("Game deleted from DB")

        # Ensure the response includes all required fields
        response_data = {
            "message": "Dealer has finished their turn.",
            "dealer_hand": dealer_hand,
            "player_hands": player_hands,
            "results": results,
            "new_balance": float(user.balance)  # Ensure balance is returned as a float
        }

        return JsonResponse(response_data)

    except BlackjackGame.DoesNotExist:
        return JsonResponse({"error": "No active game found."}, status=400)
    except Exception as e:
        # Catch any other unexpected errors
        print(f"❌ Unexpected error in process_dealer: {str(e)}")
        return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)
