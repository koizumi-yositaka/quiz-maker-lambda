export const sysConst = {
    tableName: {
        // RDS
        users: 'm_users',
        projects: 'm_projects',
        requestTypes: 'm_request_types',
        timeEntries: 't_time_entries',
        attendanceDays: 't_attendance_days',
        attendanceCorrections: 't_attendance_corrections',
        attendanceCorrectionsRequests: 't_attendance_corrections_requests',
        requests: 't_requests',
        leaveRequests: 't_leave_requests',
        workflowInstances: 't_workflow_instances',
        workflowStepHistory: 't_workflow_step_history',
        notifications: 't_notifications',
        // DynamoDB
        workflowDefinitions: 'workflow_definitions',
    },
    workflowStatus: {
        pending: 'pending',
        approved: 'approved',
        rejected: 'rejected',
        cancelled: 'cancelled',
    },
    requestType:{
        leave:{
            id: 1,  
            code: 'LEAVE',
        },
        attendanceCorrections:{
            id: 2,
            code: 'ATTENDANCE_CORRECTIONS',
        },
    }
}