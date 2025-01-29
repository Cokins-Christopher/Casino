from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Transaction

# ✅ Register CustomUser with the admin panel
@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ('id', 'username', 'email', 'balance', 'last_spin', 'is_staff', 'is_active')  # ✅ Added all useful fields
    list_filter = ('is_staff', 'is_active', 'last_spin')  # ✅ Added filter for last spin
    search_fields = ('username', 'email')
    ordering = ('-last_spin',)  # ✅ Show most recent spins first
    readonly_fields = ('last_spin',)  # ✅ Make last_spin read-only
    fieldsets = (
        (None, {'fields': ('username', 'email', 'password')}),
        ('Personal Info', {'fields': ('balance', 'last_spin')}),
        ('Permissions', {'fields': ('is_staff', 'is_active', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

# ✅ Register Transaction with the admin panel
@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    model = Transaction
    list_display = ('id', 'user', 'amount', 'transaction_type', 'timestamp')  # ✅ Added transaction type
    search_fields = ('user__username', 'user__email')
    list_filter = ('transaction_type', 'timestamp')  # ✅ Filter by win/purchase
    ordering = ('-timestamp',)  # ✅ Show newest transactions first
    readonly_fields = ('timestamp',)  # ✅ Make timestamp read-only
