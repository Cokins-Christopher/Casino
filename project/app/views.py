from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate
from .models import CustomUser,  BlackjackGame  # Use your custom user model
from .serializer import UserSerializer
from rest_framework.permissions import AllowAny
from django.http import JsonResponse
import json
from .models import Transaction
from datetime import datetime, timedelta
from django.utils.timezone import now
from django.db import models
from django.db.models import Sum, Count
from django.contrib.auth.hashers import check_password, make_password
from .utils import create_deck, calculate_hand_value
from .blackjack import process_dealer

# User Registration View
class RegisterUserView(generics.ListCreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]  # Allow anyone to register

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User registered successfully!"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# User Login View
@csrf_exempt
def login_user(request):
    if request.method == "POST":
        data = json.loads(request.body)
        email = data.get("email")
        password = data.get("password")

        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return JsonResponse({"error": "Invalid email or user does not exist"}, status=401)

        user = authenticate(request, username=user.username, password=password)

        if user is not None:
            # Generate a simple token (in a real app, you would use something like JWT)
            import time
            import hashlib
            token = hashlib.sha256(f"{user.id}:{time.time()}".encode()).hexdigest()
            
            return JsonResponse({
                "message": "Login successful",
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "balance": float(user.balance),
                "token": token
            }, status=200)
        else:
            return JsonResponse({"error": "Invalid credentials"}, status=401)

    return JsonResponse({"error": "Invalid request method"}, status=405)

@csrf_exempt
def leaderboard(request, period):
    time_filter = {
        "day": now() - timedelta(days=1),
        "week": now() - timedelta(weeks=1),
        "month": now() - timedelta(days=30),
    }

    # ✅ Filter only winnings (transaction_type = "win")
    top_winners = (
        Transaction.objects.filter(transaction_type="win", timestamp__gte=time_filter[period])  # ✅ Exclude purchases
        .values("user__username")
        .annotate(total_winnings=models.Sum("amount"))
        .order_by("-total_winnings")[:10]  # ✅ Get top 10 winners
    )

    return JsonResponse(list(top_winners), safe=False)

@csrf_exempt
def update_spin(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            user_id = data.get("userId")
            amount = data.get("amount")

            print(f"🔍 Received User ID: {user_id}")  # Debugging log

            user = CustomUser.objects.get(id=user_id)

            # Check if the user has spun in the last 24 hours
            if user.last_spin and now() - user.last_spin < timedelta(hours=24):
                next_spin_time = user.last_spin + timedelta(hours=24)
                return JsonResponse({
                    "error": "You can only spin once every 24 hours.",
                    "nextSpin": next_spin_time.timestamp() * 1000  # Convert to JS timestamp
                }, status=400)

            # Update balance & last spin time
            user.balance += amount
            user.last_spin = now()
            user.save()

            # ✅ Log the win transaction (only winnings are recorded for the leaderboard)
            Transaction.objects.create(user=user, amount=amount, transaction_type="win")

            return JsonResponse({
                "message": f"You won {amount} coins!",
                "balance": float(user.balance),
                "lastSpinTime": user.last_spin.timestamp() * 1000  # Convert to JS timestamp
            })

        except CustomUser.DoesNotExist:
            print("❌ User not found!")  # Debugging log
            return JsonResponse({"error": "User not found"}, status=404)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON format"}, status=400)

    return JsonResponse({"error": "Invalid request method"}, status=405)

@csrf_exempt
def last_spin(request, user_id):
    try:
        user = CustomUser.objects.get(id=user_id)
        return JsonResponse({"lastSpinTime": user.last_spin.timestamp() * 1000 if user.last_spin else None})
    except CustomUser.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
    
@csrf_exempt
def purchase_coins(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            user_id = data.get("userId")
            amount = data.get("amount")

            user = CustomUser.objects.get(id=user_id)

            # Add purchased coins to the user's balance
            user.balance += amount
            user.save()

            # Log the transaction
            Transaction.objects.create(user=user, amount=amount, transaction_type="purchase")

            return JsonResponse({
                "message": f"Successfully purchased {amount} coins!",
                "balance": float(user.balance)  # Return updated balance
            })

        except CustomUser.DoesNotExist:
            return JsonResponse({"error": "User not found"}, status=404)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON format"}, status=400)
    else:
        return JsonResponse({"error": "Invalid request method"}, status=405)
    
@csrf_exempt
def view_stats(request, user_id):
    try:
        user = CustomUser.objects.get(id=user_id)

        # ✅ Calculate total winnings (only "win" transactions)
        total_winnings = Transaction.objects.filter(user=user, transaction_type="win").aggregate(Sum("amount"))["amount__sum"] or 0

        # ✅ Calculate total purchases (only "purchase" transactions)
        total_purchased = Transaction.objects.filter(user=user, transaction_type="purchase").aggregate(Sum("amount"))["amount__sum"] or 0

        # ✅ Calculate total losses (only "loss" transactions)
        total_losses = Transaction.objects.filter(user=user, transaction_type="loss").aggregate(Sum("amount"))["amount__sum"] or 0

        # ✅ Net Winnings = Total Winnings - Total Losses (ignores purchases)
        net_winnings = total_winnings - total_losses

        # ✅ Count total spins
        total_spins = Transaction.objects.filter(user=user, transaction_type="win").count()

        # ✅ Calculate average win per spin
        avg_win_per_spin = round(total_winnings / total_spins, 2) if total_spins > 0 else 0

        # ✅ Get last spin date
        last_spin_date = user.last_spin.strftime("%Y-%m-%d %H:%M:%S") if user.last_spin else "No spins yet"

        return JsonResponse({
            "username": user.username,
            "total_winnings": total_winnings,
            "total_purchased": total_purchased,
            "total_losses": total_losses,
            "net_winnings": net_winnings,
            "total_spins": total_spins,
            "average_win_per_spin": avg_win_per_spin,
            "last_spin": last_spin_date,
        })

    except CustomUser.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
    
@csrf_exempt
def account_info(request, user_id):
    try:
        user = CustomUser.objects.get(id=user_id)

        if request.method == "GET":
            return JsonResponse({
                "username": user.username,
                "email": user.email,
            })

        elif request.method == "POST":
            data = json.loads(request.body)
            edit_type = data.get("edit_type")  # "username" or "email"
            old_value = data.get("old_value")
            new_value = data.get("new_value")

            if not old_value or not new_value:
                return JsonResponse({"error": "Both old and new values are required."}, status=400)

            if edit_type == "username":
                if old_value != user.username:
                    return JsonResponse({"error": "Incorrect current username."}, status=400)
                if CustomUser.objects.filter(username=new_value).exists():
                    return JsonResponse({"error": "Username already taken."}, status=400)
                user.username = new_value

            elif edit_type == "email":
                if old_value != user.email:
                    return JsonResponse({"error": "Incorrect current email."}, status=400)
                if CustomUser.objects.filter(email=new_value).exists():
                    return JsonResponse({"error": "Email already in use."}, status=400)
                user.email = new_value

            user.save()
            return JsonResponse({"message": f"{edit_type.capitalize()} updated successfully!"})

    except CustomUser.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
    
@csrf_exempt
def verify_password(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            user_id = data.get("userId")
            current_password = data.get("current_password")

            user = CustomUser.objects.get(id=user_id)

            if check_password(current_password, user.password):
                return JsonResponse({"password": "YourActualPasswordHere"})  # ✅ Replace with secure retrieval logic
            else:
                return JsonResponse({"error": "Incorrect password"}, status=400)

        except CustomUser.DoesNotExist:
            return JsonResponse({"error": "User not found"}, status=404)
    return JsonResponse({"error": "Invalid request method"}, status=405)



@csrf_exempt
def start_blackjack(request):
    """Starts a new Blackjack game using session authentication."""
    data = json.loads(request.body)
    user_id = data.get("user_id") or request.session.get("user_id") or request.session.get("_auth_user_id")  # Try to get user_id from request body first

    if not user_id:
        return JsonResponse({"error": "User not logged in"}, status=401)

    try:
        user = CustomUser.objects.get(id=user_id)
        bets = data.get("bets", {})

        if not bets:
            return JsonResponse({"error": "No bets placed."}, status=400)

        total_bet = sum(bets.values())
        if user.balance < total_bet:
            return JsonResponse({"error": "Insufficient balance."}, status=400)

        user.balance -= total_bet
        user.save()

        deck = create_deck()
        player_hands = {spot: [deck.pop(), deck.pop()] for spot in bets.keys()}
        dealer_hand = [deck.pop(), deck.pop()]

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
def blackjack_action(request):
    """Processes a player's action in Blackjack."""
    data = json.loads(request.body)
    user_id = data.get("user_id") or request.session.get("user_id") or request.session.get("_auth_user_id")  # Try to get user_id from request body first
    action = data.get("action")  # "hit", "stand", "double", "split"
    current_hand = data.get("hand", "main")  # Get the current hand being played
    process_dealer_flag = data.get("process_dealer", False)  # Check if explicit process_dealer flag is set

    if not user_id:
        return JsonResponse({"error": "User not logged in"}, status=401)

    try:
        user = CustomUser.objects.get(id=user_id)
        game = BlackjackGame.objects.filter(user=user).latest("created_at")

        # If process_dealer flag is explicitly set, go straight to dealer processing
        if process_dealer_flag and action == 'stand':
            # Store the user_id in the request session for the process_dealer function
            request.session["current_user_id"] = user.id
            return process_dealer(request)

        deck = game.deck
        player_hands = game.player_hands
        dealer_hand = game.dealer_hand
        bets = game.bets
        
        # Update current spot in the game
        game.current_spot = current_hand
        
        # Check if the specified hand exists
        if current_hand not in player_hands:
            return JsonResponse({"error": f"Hand {current_hand} not found"}, status=400)
        
        # Get the current hand
        current_hand_cards = player_hands[current_hand]

        if action == "hit":
            # Add a card to the current hand
            player_hands[current_hand].append(deck.pop())

        elif action == "stand":
            # Stand on current hand, move to next or dealer
            pass  # No changes to hands needed, frontend will handle moving to next hand

        elif action == "double":
            # Check if we can double (only with 2 cards)
            if len(current_hand_cards) != 2:
                return JsonResponse({"error": "Can only double on initial two cards."}, status=400)
                
            # Check if player has enough balance
            if user.balance < bets[current_hand]:
                return JsonResponse({"error": "Insufficient balance."}, status=400)

            # Double the bet and take exactly one card
            user.balance -= bets[current_hand]
            user.save()
            bets[current_hand] *= 2
            player_hands[current_hand].append(deck.pop())
            
            # If this is the last hand, process dealer immediately
            is_last_hand = current_hand == list(player_hands.keys())[-1]
            
            if is_last_hand:
                # Update game state first
                game.deck = deck
                game.player_hands = player_hands
                game.bets = bets
                game.save()
                
                # Process dealer
                request.session["current_user_id"] = user.id
                return process_dealer(request)

        elif action == "split":
            # Check if hand has exactly 2 cards of the same rank
            if (len(current_hand_cards) != 2 or 
                current_hand_cards[0]["rank"] != current_hand_cards[1]["rank"]):
                return JsonResponse({"error": "Cannot split this hand."}, status=400)

            # Check if player has enough balance for the additional bet
            if user.balance < bets[current_hand]:
                return JsonResponse({"error": "Insufficient balance."}, status=400)

            # Deduct the additional bet
            user.balance -= bets[current_hand]
            user.save()

            # Create a unique key for the split hand
            split_hand_key = f"split_{current_hand}"
            # If that key already exists, add a number
            count = 1
            while split_hand_key in player_hands:
                count += 1
                split_hand_key = f"split_{current_hand}_{count}"

            # Create two new hands with one card each
            card1 = player_hands[current_hand].pop()
            card2 = player_hands[current_hand].pop()
            
            # Deal a new card to each hand
            player_hands[current_hand] = [card1, deck.pop()]
            player_hands[split_hand_key] = [card2, deck.pop()]
            
            # Add the bet for the new hand
            bets[split_hand_key] = bets[current_hand]

        # Update game state
        game.deck = deck
        game.player_hands = player_hands
        game.bets = bets
        game.save()

        # Check if we need to process dealer
        all_busted = True
        for hand in player_hands.values():
            hand_value = calculate_hand_value(hand)
            if hand_value <= 21:
                all_busted = False
                break
        
        if all_busted and action != "stand":
            # If all hands are busted, proceed to dealer directly
            request.session["current_user_id"] = user.id
            dealer_result = process_dealer(request)
            return dealer_result
        
        return JsonResponse({
            "message": "Action processed",
            "player_hands": player_hands,
            "new_balance": float(user.balance)  # Include updated balance
        })

    except CustomUser.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
    except BlackjackGame.DoesNotExist:
        return JsonResponse({"error": "No active game found"}, status=400)
