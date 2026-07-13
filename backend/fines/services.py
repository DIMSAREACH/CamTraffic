"""Fine-related business logic."""
from notifications.services import notify_driver_fine as _notify_driver_fine


def notify_driver_fine(driver, fine):
    _notify_driver_fine(driver, fine)
