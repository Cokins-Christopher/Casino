from django.shortcuts import render
from rest_framework.views import APIView
from .models import *
from rest_framework import generics
from .models import React
from .serializer import ReactSerializer

class ReactView(generics.ListCreateAPIView):
    queryset = React.objects.all()
    serializer_class = ReactSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        name = self.request.query_params.get('name')
        if name:
            queryset = queryset.filter(employee=name)
        return queryset