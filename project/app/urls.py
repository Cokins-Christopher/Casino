from django.urls import path
from .views import RegisterUserView, login_user

urlpatterns = [
    path('users/', RegisterUserView.as_view(), name='user-list-create'),
    path('login/', login_user, name='user-login'),
]