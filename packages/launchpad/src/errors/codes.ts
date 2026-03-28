export const LaunchpadErrorCodes = {
  // Rocket domain errors
  ROCKET_NOT_FOUND: 'launchpad.rocket_not_found',
  ROCKET_INVALID_STATE: 'launchpad.rocket_invalid_state',
  ROCKET_CONTAINER_REPLACE_FAILED: 'launchpad.rocket_container_replace_failed',
  // Deployment errors
  DEPLOYMENT_BACKUP_NOT_FOUND: 'launchpad.deployment_backup_not_found',
  DEPLOYMENT_NO_MISSION: 'launchpad.deployment_no_mission',
  // Infrastructure errors
  DOCKER_BUILD_FAILED: 'launchpad.docker_build_failed',
  DOCKER_PORT_MAPPING_FAILED: 'launchpad.docker_port_mapping_failed',
  DOCKER_COPY_FAILED: 'launchpad.docker_copy_failed',
  GIT_CLONE_FAILED: 'launchpad.git_clone_failed',
  DEPENDENCY_INSTALL_FAILED: 'launchpad.dependency_install_failed',
  SCAFFOLD_FAILED: 'launchpad.scaffold_failed',
} as const

export type LaunchpadErrorCode = (typeof LaunchpadErrorCodes)[keyof typeof LaunchpadErrorCodes]
