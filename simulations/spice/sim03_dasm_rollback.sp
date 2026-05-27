* DASM: Analog weight accumulates drift, SRAM snapshot restores identically
* Purpose: Validate Lemma 6.2 - E[error_rollback] = 0

* Simulate Analog Drift as a growing random walk
* LTspice uses white() function for random noise in behavioral sources
B_drift noise_walk 0 V=1.0 + 0.1 * (time/100n) * white(time*1e10)
R_drift noise_walk analog_val 1k
C_drift analog_val 0 1p

* Digital SRAM Snapshot (Constant, frozen value)
V_sram sram_out 0 PWL(0 1.0 200n 1.0)

* DASM Rollback Trigger at t=100n
V_trigger trig 0 PWL(0 0 99.9n 0 100n 1 200n 1)

* Voltage Controlled Switch to model Rollback Mux
S_analog analog_val final_out trig 0 SW_OFF
S_sram sram_out final_out trig 0 SW_ON

.model SW_OFF SW(Vt=0.5 Ron=1T Roff=1)
.model SW_ON SW(Vt=0.5 Ron=1 Roff=1T)

* Dummy termination
R_dummy final_out 0 1Meg

.tran 1n 200n

* Probe the outputs
* (Removed .probe as LTspice automatically saves all nodes or uses .save instead)

* Measure drift vs rollback error
.meas TRAN drift_accumulation RMS V(analog_val) FROM=0 TO=100n
.meas TRAN rollback_error RMS V(final_out) FROM=100n TO=200n

.end
