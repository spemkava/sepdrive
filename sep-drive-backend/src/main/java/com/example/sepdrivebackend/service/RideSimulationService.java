package com.example.sepdrivebackend.service;

import com.example.sepdrivebackend.model.Coordinate;
import com.example.sepdrivebackend.model.Ride;
import com.example.sepdrivebackend.model.RideSimulation;
import com.example.sepdrivebackend.repository.RideRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.*;

@Service
public class RideSimulationService {


        private RideRepository rideRepository;
        private final Map<Long, RideSimulation> simulations = new ConcurrentHashMap<>();
        private final Map<Long, ScheduledFuture<?>> timers = new ConcurrentHashMap<>();
        private final ScheduledExecutorService executor = Executors.newScheduledThreadPool(4);

        @Autowired
        public RideSimulationService(RideRepository rideRepository) {
            this.rideRepository = rideRepository;
        }



        // Zum Testen ein paar Dummy-Routen (z. B. 10 Koordinaten)
        private List<Coordinate> createDummyRoute() {
            List<Coordinate> route = new ArrayList<>();
            for (int i = 0; i < 10; i++) {
                route.add(new Coordinate(52.0 + i * 0.01, 13.0 + i * 0.01)); // Beispielkoordinaten
            }
            return route;


    }

        public void startSimulation(Long rideId) {
            // Beende vorherige ggf. laufende Simulation
            stopSimulation(rideId);

            Ride ride = rideRepository.findById(rideId).orElse(null);
            List<Coordinate> route = null;
            if (ride != null) {
                route = ride.getRoute();
            }
            if (route == null || route.isEmpty()) {
                route = createDummyRoute(); // Fallback auf Dummy-Routen
            }
            double speed = 1; // Ein Schritt pro Sekunde

            RideSimulation simulation = new RideSimulation(rideId, route, speed);
            simulations.put(rideId, simulation);

            ScheduledFuture<?> task = executor.scheduleAtFixedRate(() -> {
                RideSimulation sim = simulations.get(rideId);
                if (sim == null || !"RUNNING".equals(sim.getStatus())) return;

                // Wenn am letzten Punkt, Status fertig
                if (sim.getCurrentStep() >= sim.getRoute().size() - 1) {
                    sim.setStatus("FINISHED");
                    stopSimulation(rideId);
                } else {
                    sim.setCurrentStep(sim.getCurrentStep() + 1);
                }
            }, 0, (long)(1000 / speed), TimeUnit.MILLISECONDS);

            timers.put(rideId, task);
        }

        public synchronized RideSimulation getSimulation(Long rideId) {
            return simulations.get(rideId);
        }

        public void pauseSimulation(Long rideId) {
            RideSimulation sim = simulations.get(rideId);
            if (sim != null) sim.setStatus("PAUSED");
        }

        public void resumeSimulation(Long rideId) {
            RideSimulation sim = simulations.get(rideId);
            if (sim != null && "PAUSED".equals(sim.getStatus())) sim.setStatus("RUNNING");
        }

        public void stopSimulation(Long rideId) {
            ScheduledFuture<?> task = timers.remove(rideId);
            if (task != null) task.cancel(true);
            // Simulation beendet, bleibt noch im Map (kannst du bei Bedarf entfernen)
        }

        public void setSpeed(Long rideId, double speed) {
            RideSimulation sim = simulations.get(rideId);
            if (sim != null) sim.setSpeed(speed);
            // (Für wirklich dynamische Zeitanpassung: Task canceln und neuen starten)
            // Vereinfachung: In dieser Minimalversion ignorieren wir dynamische Anpassung.
        }


    }

