from rest_framework import serializers
from .models import Dishes, DishSchedule

class DishesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dishes
        fields = '__all__'


class DishScheduleSerializer(serializers.ModelSerializer):
    dish = DishesSerializer(read_only=True)
    dish_id = serializers.PrimaryKeyRelatedField(
        source='dish',
        queryset=Dishes.objects.filter(available=True, dishDay=True, category='almoco'),
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = DishSchedule
        fields = ['id', 'date', 'dish', 'dish_id', 'is_open', 'note']

    def validate(self, attrs):
        is_open = attrs.get('is_open', getattr(self.instance, 'is_open', True))
        dish = attrs.get('dish', getattr(self.instance, 'dish', None))

        if is_open and dish is None:
            raise serializers.ValidationError({
                'dish_id': 'Selecione um prato para dias marcados como abertos.'
            })

        if dish and (not dish.available or not dish.dishDay or dish.category != 'almoco'):
            raise serializers.ValidationError({
                'dish_id': 'Somente pratos de almoço marcados como prato do dia podem ser agendados.'
            })

        return attrs