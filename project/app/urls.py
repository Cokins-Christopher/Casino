from django.urls import path
from .views import RegisterUserView, login_user, leaderboard, update_spin, last_spin  # Import only what's necessary

urlpatterns = [
    path('users/', RegisterUserView.as_view(), name='user-register'),
    path('login/', login_user, name='user-login'),
    path('leaderboard/<str:period>/', leaderboard, name='leaderboard'),  # Use leaderboard directly
    path('update-spin/', update_spin, name='update-spin'),
    path('last-spin/<int:user_id>/', last_spin, name='last-spin'),
]
