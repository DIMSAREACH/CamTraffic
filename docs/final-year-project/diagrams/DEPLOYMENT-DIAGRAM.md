# Deployment Diagram (Task 228)

```mermaid
architecture-beta
    group edge(cloud)[Public Internet]
    group vps(server)[Ubuntu 22.04 VPS]
    group app(server)[Application Containers] in vps
    group data(database)[Data Services] in vps

    service user_portal(internet)[Admin/User Browsers] in edge
    service nginx(server)[Nginx Reverse Proxy] in app
    service backend(server)[Django + Gunicorn] in app
    service ai(server)[FastAPI AI Service] in app
    service celery(server)[Celery Worker/Beat] in app
    service postgres(database)[PostgreSQL] in data
    service redis(disk)[Redis] in data
    service certbot(cloud)[Certbot] in app

    user_portal:R --> L:nginx
    nginx:B --> T:backend
    nginx:B --> T:ai
    backend:R --> L:postgres
    backend:R --> L:redis
    celery:R --> L:redis
    celery:R --> L:postgres
    celery:T --> B:ai
    certbot:L --> R:nginx
```
