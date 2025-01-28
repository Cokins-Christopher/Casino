from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Transaction

# Register CustomUser with the admin
@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ('id', 'username', 'email', 'balance', 'last_spin', 'is_staff', 'is_active')  # Added ID & Last Spin
    list_filter = ('is_staff', 'is_active', 'last_spin')  # Added last_spin to filters
    search_fields = ('username', 'email')
    ordering = ('-last_spin',)  # Order by most recent spins

# Register Transaction with the admin
@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    model = Transaction
    list_display = ('user', 'amount', 'timestamp')
    search_fields = ('user__username', 'user__email')
    list_filter = ('timestamp',)
