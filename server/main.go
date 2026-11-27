package main

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/moby/moby/client"
)

func main() {
	docker, err := client.New(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalf("docker client: %v", err)
	}
	defer docker.Close()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		ping, err := docker.Ping(r.Context(), client.PingOptions{})
		if err != nil {
			http.Error(w, "docker unreachable: "+err.Error(), http.StatusServiceUnavailable)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"docker": ping.APIVersion})
	})

	log.Println("listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
