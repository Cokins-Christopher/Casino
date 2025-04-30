from django.urls import path
from .views import RegisterUserView, login_user, leaderboard, update_spin, last_spin  # Import only what's necessary
from .views import purchase_coins, view_stats, account_info, verify_password
from .views import start_blackjack, blackjack_action, update_balance

urlpatterns = [
    path('users/', RegisterUserView.as_view(), name='user-register'),
    path('login/', login_user, name='user-login'),
    path('leaderboard/<str:period>/', leaderboard, name='leaderboard'),
    path('update-spin/', update_spin, name='update-spin'),
    path('last-spin/<int:user_id>/', last_spin, name='last-spin'), 
    path('purchase-coins/', purchase_coins, name='purchase-coins'),
    path('view-stats/<int:user_id>/', view_stats, name='view-stats'),
    path('account-info/<int:user_id>/', account_info, name='account-info'),
    path('verify-password/', verify_password, name='verify-password'),
    path('blackjack/start/', start_blackjack, name='start_blackjack'),
    path('blackjack/action/', blackjack_action, name='blackjack_action'),
    path('users/update-balance/', update_balance, name='update_balance'),
]
