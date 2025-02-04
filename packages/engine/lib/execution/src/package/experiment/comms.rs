pub(crate) mod control;
pub(crate) mod update;

pub use self::{control::ExpPkgCtlRecv, update::ExpPkgUpdateSend};
use crate::package::simulation::SimulationId;

#[derive(Debug)]
#[allow(clippy::enum_variant_names)]
pub enum ExperimentControl {
    StartSim {
        sim_id: SimulationId,
        changed_globals: serde_json::Value,
        max_num_steps: usize,
        span_id: Option<tracing::span::Id>,
    },
    // TODO: add span_ids
    PauseSim(SimulationId),
    ResumeSim(SimulationId),
    StopSim(SimulationId),
}

pub struct ExperimentPackageComms {
    pub step_update_sender: ExpPkgUpdateSend,
    pub ctl_recv: ExpPkgCtlRecv,
}

#[derive(Debug)]
pub struct StepUpdate {
    pub sim_id: SimulationId,
    pub was_error: bool,
    pub stop_signal: bool,
}
