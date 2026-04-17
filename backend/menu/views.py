from django.http import JsonResponse
from datetime import datetime
from django.utils import timezone
from django.db import transaction
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Dishes, DishSchedule
from .serializers import DishesSerializer, DishScheduleSerializer
from accounts.permissions import IsManager

def health(request):
    return JsonResponse({
        'data': datetime.now().isoformat()
    })

class DishViewSet(viewsets.ModelViewSet):
    queryset = Dishes.objects.all()
    serializer_class = DishesSerializer

    def get_queryset(self):
        queryset = Dishes.objects.all().order_by('category', 'name')
        special_candidates = self.request.query_params.get('special_candidates')
        if special_candidates in ['1', 'true', 'True']:
            return queryset.filter(available=True, dishDay=True, category='almoco')

        if self.request.method in permissions.SAFE_METHODS:
            user = self.request.user
            if user and user.is_authenticated and (user.is_superuser or user.groups.filter(name='Manager').exists()):
                return queryset
            return queryset.filter(available=True)
        return queryset

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsManager()]


class DishScheduleViewSet(viewsets.ModelViewSet):
    queryset = DishSchedule.objects.select_related('dish').all()
    serializer_class = DishScheduleSerializer

    def get_queryset(self):
        queryset = DishSchedule.objects.select_related('dish').all()
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        return queryset.order_by('date')

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsManager()]

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def today(self, request):
        today = timezone.localdate()
        schedule = DishSchedule.objects.select_related('dish').filter(date=today).first()

        if not schedule:
            return Response({
                'date': today,
                'is_open': True,
                'note': 'Infelizmente não temos prato do dia disponível hoje. Confira as outras opções do cardápio.',
                'dish': None,
            })

        serializer = self.get_serializer(schedule)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsManager])
    def bulk_upsert(self, request):
        schedules = request.data.get('schedules', [])

        if not isinstance(schedules, list) or not schedules:
            return Response({'error': 'Informe uma lista de agendas.'}, status=400)

        response_payload = []

        try:
            with transaction.atomic():
                for item in schedules:
                    date_value = item.get('date')
                    schedule = DishSchedule.objects.filter(date=date_value).first()

                    serializer = self.get_serializer(
                        schedule,
                        data=item,
                        partial=bool(schedule),
                    )
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                    response_payload.append(serializer.data)
        except Exception as exc:
            return Response({'error': str(exc)}, status=400)

        return Response(response_payload)