from django.urls import path
from .views import RegisterUserView

urlpatterns = [
    path('users/', RegisterUserView.as_view(), name='user-list-create'),
]
