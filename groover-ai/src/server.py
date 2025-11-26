from fastapi import FastAPI

app = FastAPI(title="Groover AI Engine")

@app.get("/")
def root():
    return {"message": "Groover AI Engine is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
