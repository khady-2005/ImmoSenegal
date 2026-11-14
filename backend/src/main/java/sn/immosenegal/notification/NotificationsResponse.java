package sn.immosenegal.notification;

import java.util.List;

public record NotificationsResponse(List<NotificationResponse> notifications, long nonLues) {}
