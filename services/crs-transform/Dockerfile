FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn[standard] pyproj pydantic
COPY app ./app
EXPOSE 9000
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","9000"]
