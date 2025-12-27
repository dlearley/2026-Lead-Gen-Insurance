"""Add segmentation and automation models

Revision ID: 3a1b2c3d4e5f
Revises: a72fa6df4b85
Create Date: 2025-12-27 00:00:00.000000

"""
from typing import Tuple
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '3a1b2c3d4e5f'
down_revision: str = 'a72fa6df4b85'
branch_labels: str | Tuple[str, ...] | None = None
depends_on: str | Tuple[str, ...] | None = None


def upgrade() -> None:
    # Create segment_rules table
    op.create_table('segment_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('segment_id', sa.Integer(), nullable=False),
        sa.Column('field', sa.Enum('status', 'priority', 'source', 'insurance_type', 'state', 'city', 'value_estimate', 'created_at', 'updated_at', 'tags', name='segmentfield'), nullable=False),
        sa.Column('operator', sa.Enum('equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'in', 'not_in', 'starts_with', 'ends_with', name='segmentoperator'), nullable=False),
        sa.Column('value', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('rule_order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['segment_id'], ['segments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_segment_rules_segment_id', 'segment_id')
    )
    
    # Create segments table
    op.create_table('segments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_dynamic', sa.Boolean(), nullable=False),
        sa.Column('match_all_rules', sa.Boolean(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_segments_organization_id', 'organization_id'),
        sa.Index('ix_segments_slug', 'slug', unique=True)
    )
    
    # Create lead_segments table
    op.create_table('lead_segments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lead_id', sa.Integer(), nullable=False),
        sa.Column('segment_id', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('added_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['segment_id'], ['segments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_lead_segments_lead_id', 'lead_id'),
        sa.Index('ix_lead_segments_segment_id', 'segment_id')
    )
    
    # Create automation_actions table
    op.create_table('automation_actions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('automation_id', sa.Integer(), nullable=False),
        sa.Column('action_type', sa.Enum('send_email', 'update_lead_status', 'update_lead_priority', 'assign_lead', 'add_tag', 'remove_tag', 'create_task', 'send_notification', name='automationactiontype'), nullable=False),
        sa.Column('action_order', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('configuration', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['automation_id'], ['automations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_automation_actions_automation_id', 'automation_id')
    )
    
    # Create automations table
    op.create_table('automations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('trigger_type', sa.Enum('lead_created', 'lead_status_changed', 'lead_priority_changed', 'lead_assigned', 'lead_value_changed', 'time_based', 'segment_entered', 'segment_exited', name='automationtriggertype'), nullable=False),
        sa.Column('trigger_configuration', sa.JSON(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('run_immediately', sa.Boolean(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('campaign_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_automations_campaign_id', 'campaign_id'),
        sa.Index('ix_automations_organization_id', 'organization_id'),
        sa.Index('ix_automations_slug', 'slug', unique=True)
    )
    
    # Create automation_runs table
    op.create_table('automation_runs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('automation_id', sa.Integer(), nullable=False),
        sa.Column('lead_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('trigger_data', sa.JSON(), nullable=False),
        sa.Column('execution_log', sa.JSON(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['automation_id'], ['automations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_automation_runs_automation_id', 'automation_id'),
        sa.Index('ix_automation_runs_lead_id', 'lead_id')
    )
    
    # Create email_templates table
    op.create_table('email_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('body_html', sa.Text(), nullable=False),
        sa.Column('body_text', sa.Text(), nullable=True),
        sa.Column('template_type', sa.String(length=100), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_email_templates_organization_id', 'organization_id'),
        sa.Index('ix_email_templates_slug', 'slug', unique=True)
    )
    
    # Create scheduled_tasks table
    op.create_table('scheduled_tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_type', sa.String(length=100), nullable=False),
        sa.Column('task_data', sa.JSON(), nullable=False),
        sa.Column('scheduled_for', sa.DateTime(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('priority', sa.Integer(), nullable=False),
        sa.Column('retry_count', sa.Integer(), nullable=False),
        sa.Column('max_retries', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_scheduled_tasks_organization_id', 'organization_id'),
        sa.Index('ix_scheduled_tasks_scheduled_for', 'scheduled_for'),
        sa.Index('ix_scheduled_tasks_status', 'status')
    )


def downgrade() -> None:
    # Drop tables in reverse order of creation
    op.drop_table('scheduled_tasks')
    op.drop_table('email_templates')
    op.drop_table('automation_runs')
    op.drop_table('automations')
    op.drop_table('automation_actions')
    op.drop_table('lead_segments')
    op.drop_table('segments')
    op.drop_table('segment_rules')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS automationactiontype')
    op.execute('DROP TYPE IF EXISTS automationtriggertype')
    op.execute('DROP TYPE IF EXISTS segmentoperator')
    op.execute('DROP TYPE IF EXISTS segmentfield')