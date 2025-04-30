from django.urls import path
from .views import RegisterUserView, login_user, logout_user, leaderboard, update_spin, last_spin
from .views import purchase_coins, view_stats, account_info, verify_password
from .views import start_blackjack, blackjack_action, update_balance, blackjack_last_action
from .views import blackjack_hit, blackjack_stand, game_config, game_statistics
from .views import admin_user_list, admin_transaction_list, admin_transaction_filter, admin_user_detail
from .views import admin_modify_user, admin_modify_wallet
from .views import game_start, game_action, game_history, game_detail, available_games
from .views import user_transactions, top_winners
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from .views_transactions import create_transaction, transaction_detail, transaction_status

# Create stub/mock views for endpoints that aren't implemented yet
def stub_view(request, *args, **kwargs):
    return JsonResponse({"message": "API endpoint not fully implemented"}, status=501)

urlpatterns = [
    # User authentication
    path('users/', RegisterUserView.as_view(), name='user-register'),
    # We actually need both of these because tests use different names
    path('login/', csrf_exempt(login_user), name='login'),
    # user-login is required for backward compatibility with tests
    path('api/login/', csrf_exempt(login_user), name='user-login'),
    path('logout/', logout_user, name='user-logout'),
    path('register/', RegisterUserView.as_view(), name='register'),
    
    # User profile and account
    path('account-info/<int:user_id>/', account_info, name='account-info'),
    path('verify-password/', verify_password, name='verify-password'),
    path('users/update-balance/', update_balance, name='update_balance'),
    
    # Wallet and transactions
    path('wallet/', account_info, kwargs={'user_id': 'me'}, name='wallet-info'),
    path('transactions/', user_transactions, name='transaction-list'),
    path('user-transactions/', user_transactions, name='user-transactions'),
    path('top-winners/', top_winners, name='top-winners'),
    
    # Transaction management
    path('transactions/create/', csrf_exempt(create_transaction), name='transaction-create'),
    path('transactions/<int:transaction_id>/', transaction_detail, name='transaction-detail'),
    path('transactions/status/<int:transaction_id>/', transaction_status, name='transaction-status'),
    
    # Game related
    path('games/start/', game_start, name='game-start'),
    path('games/history/', game_history, name='game-history'),
    path('games/detail/<int:game_id>/', game_detail, name='game-detail'),
    path('games/available/', available_games, name='available-games'),
    path('games/action/<int:game_id>/', game_action, name='game-action'),
    path('games/action/', game_action, name='game-action-no-id'),
    path('games/config/', game_config, name='game-config'),
    path('games/statistics/', game_statistics, name='game-statistics'),
    
    # Blackjack specific
    path('blackjack/start/', start_blackjack, name='blackjack-start'),
    path('blackjack/hit/<int:game_id>/', blackjack_hit, name='blackjack-hit'),
    path('blackjack/stand/<int:game_id>/', blackjack_stand, name='blackjack-stand'),
    path('blackjack/action/', blackjack_action, name='blackjack_action'),
    path('blackjack/last_action/', blackjack_last_action, name='blackjack_last_action'),
    
    # Admin endpoints
    path('admin/users/', admin_user_list, name='admin-users'),
    path('admin/users/<int:user_id>/', admin_user_detail, name='admin-user-detail'),
    path('admin/users/<int:user_id>/update/', admin_modify_user, name='admin-modify-user'),
    path('admin/wallet/<int:user_id>/', admin_modify_wallet, name='admin-wallet'),
    path('admin/transactions/', admin_transaction_list, name='admin-transactions'),
    path('admin/transactions/filter/', admin_transaction_filter, name='admin-transactions-filter'),
    
    # Daily bonus
    path('leaderboard/<str:period>/', leaderboard, name='leaderboard'),
    path('update-spin/', update_spin, name='update-spin'),
    path('last-spin/<int:user_id>/', last_spin, name='last-spin'), 
    path('purchase-coins/', purchase_coins, name='purchase-coins'),
    path('view-stats/<int:user_id>/', view_stats, name='view-stats'),
]
