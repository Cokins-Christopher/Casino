from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate
from .models import CustomUser  # Use your custom user model
from .serializer import UserSerializer
from rest_framework.permissions import AllowAny
from django.http import JsonResponse
import json
from .models import Transaction
from datetime import datetime, timedelta

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
            return JsonResponse({"message": "Login successful", "username": user.username, "id": user.id}, status=200)
        else:
            return JsonResponse({"error": "Invalid credentials"}, status=401)

    return JsonResponse({"error": "Invalid request method"}, status=405)

def leaderboard(request, period):
    top_earners = Transaction.get_top_earners(period)
    return JsonResponse(list(top_earners), safe=False)


@csrf_exempt
def update_spin(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            user_id = data.get("userId")
            amount = data.get("amount")

            # Check if user exists
            user = CustomUser.objects.get(id=user_id)
            
            # Update balance & last spin time
            user.balance += amount  
            user.last_spin = now()  
            user.save()

            return JsonResponse({
                "message": "Spin updated successfully",
                "lastSpinTime": user.last_spin.timestamp() * 1000  # Convert to JavaScript timestamp
            })

        except CustomUser.DoesNotExist:
            return JsonResponse({"error": "User not found"}, status=404)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON format"}, status=400)

    return JsonResponse({"error": "Invalid request method"}, status=405)


def last_spin(request, user_id):
    try:
        user = CustomUser.objects.get(id=user_id)

        # If user has never spun before, return None
        if not user.last_spin:
            return JsonResponse({"lastSpinTime": None})

        return JsonResponse({"lastSpinTime": user.last_spin.timestamp() * 1000})  # Convert to JavaScript timestamp
    except CustomUser.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)