# 🔔 Zenith Alerting Guide

This guide explains how to configure and manage the alerting system in Zenith to ensure your infrastructure and queues remain healthy.

---

## 🚀 Overview

Zenith's alerting engine is **Redis-Native** and **Stateless**.
*   **Persistence**: Rules are stored in Redis (`gravito:zenith:alerts:rules`).
*   **Evaluation**: The server evaluates all rules every 2 seconds against real-time metrics.
*   **Delivery**: Alerts are dispatched via Slack Webhooks.

---

## 🛠️ Configuration Fields

When adding a new rule in **Settings > Alerting**, you will encounter these fields:

### 1. Rule Name
A descriptive label for the alert (e.g., `Critical Backlog`, `Agent Offline`). This name will appear in the Slack notification.

### 2. Type (Metric Category)
*   **Queue Backlog**: Monitors the number of jobs in the `waiting` state.
*   **High Failure Count**: Monitors the number of jobs in the `failed` state.
*   **Worker Loss**: Monitors the total number of active worker nodes.
*   **Node CPU (%)**: Monitors process-level CPU usage reported by Quasar Agents.
*   **Node RAM (%)**: Monitors process-level RAM usage (RSS) relative to system total.

### 3. Threshold
The numeric value that triggers the alert.
*   For **Backlog/Failure**: The number of jobs (e.g., `1000`).
*   For **CPU/RAM**: The percentage (e.g., `90`).
*   For **Worker Loss**: The *minimum* number of workers expected (e.g., alert triggers if count is `< 2`).

### 4. Cooldown (Minutes)
**Crucial Concept**: The period the system "stays silent" after an alert is fired.
*   **Logic**: Once a rule triggers and sends a notification, it enters a "lock" state for the duration of the cooldown.
*   **Purpose**: Prevents "Alert Fatigue" and notification storms.
*   **Example**: If set to `30`, and a backlog spike occurs, you get **one** notification. You won't get another one for the same rule for 30 minutes, even if the backlog remains high.

### 5. Queue (Optional)
Specify a specific queue name (e.g., `orders`, `emails`) to monitor. If left empty, the rule applies to the **total sum** of all queues.

---

## 🌊 Best Practices

### The "Instant Fire" Design
Zenith alerts are designed for **instant awareness**.
*   If a threshold is met during a 2-second check, the alert fires **immediately**.
*   It does **not** wait for the condition to persist for multiple minutes (Debouncing).
*   **Pro Tip**: If you have frequent "tiny spikes" that resolve themselves in seconds, set your **Threshold** slightly higher than the spikes to avoid noise.

### Recommended Settings

| Scenario | Type | Threshold | Cooldown |
| :--- | :--- | :--- | :--- |
| **Critical Failure** | High Failure Count | 50 | 15m |
| **System Overload** | Node CPU | 90 | 30m |
| **Quiet Hours** | Queue Backlog | 5000 | 120m |
| **Fatal Shutdown** | Worker Loss | 1 | 10m |

---

## 🔗 Slack Integration
To receive notifications, ensure the `SLACK_WEBHOOK_URL` environment variable is set before starting the Zenith server.

```bash
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/Txxx/Bxxx/Xxxx
```
