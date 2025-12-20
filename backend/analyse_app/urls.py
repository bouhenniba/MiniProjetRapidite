from django.urls import path
from . import views

urlpatterns = [
    path('api/analyse/', views.get_analyse_data, name='analyse-data'),
]
