import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Container,
  Title,
  Button,
  Stack,
  Group,
  Paper,
  Text,
  Table,
  Badge,
  ActionIcon,
  Grid,
  Stat
} from '@mantine/core';
import { AiOutlinePlus, AiOutlineEye, AiOutlineSetting } from 'react-icons/ai';
import { apiClient } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { Head } from '../components/Head';

function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const { data: projects } = useQuery(
    ['projects'],
    async () => {
      const response = await apiClient.get('/projects');
      return response.data.data;
    }
  );

  const { data: stats } = useQuery(
    ['user-stats'],
    async () => {
      const response = await apiClient.get('/user/stats');
      return response.data;
    }
  );

  const handleCreateProject = () => {
    navigate('/getting-start');
  };

  return (
    <Container size="lg" py="md">
      <Head title="Dashboard - Cusdis" />
      
      <Stack spacing="lg">
        <Group position="apart">
          <Title order={2}>Dashboard</Title>
          <Group>
            <Text size="sm">Welcome, {user?.name}</Text>
            <Button variant="subtle" onClick={logout}>
              Logout
            </Button>
          </Group>
        </Group>

        {/* Stats */}
        <Grid>
          <Grid.Col span={4}>
            <Paper p="md" withBorder>
              <Stack spacing="xs">
                <Text size="xl" weight={700}>{stats?.projectCount || 0}</Text>
                <Text size="sm" color="dimmed">Projects</Text>
              </Stack>
            </Paper>
          </Grid.Col>
          <Grid.Col span={4}>
            <Paper p="md" withBorder>
              <Stack spacing="xs">
                <Text size="xl" weight={700}>{stats?.commentCount || 0}</Text>
                <Text size="sm" color="dimmed">Total Comments</Text>
              </Stack>
            </Paper>
          </Grid.Col>
          <Grid.Col span={4}>
            <Paper p="md" withBorder>
              <Stack spacing="xs">
                <Text size="xl" weight={700}>{stats?.pendingCount || 0}</Text>
                <Text size="sm" color="dimmed">Pending Comments</Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Projects */}
        <Paper p="md" withBorder>
          <Stack spacing="md">
            <Group position="apart">
              <Title order={3}>Your Projects</Title>
              <Button leftIcon={<AiOutlinePlus />} onClick={handleCreateProject}>
                Create Project
              </Button>
            </Group>

            {projects && projects.length > 0 ? (
              <Table>
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project: any) => (
                    <tr key={project.id}>
                      <td>
                        <Text weight={500}>{project.title}</Text>
                      </td>
                      <td>
                        <Text size="sm" color="dimmed">
                          {new Date(project.created_at).toLocaleDateString()}
                        </Text>
                      </td>
                      <td>
                        <Badge color="green" size="sm">Active</Badge>
                      </td>
                      <td>
                        <Group spacing="xs">
                          <ActionIcon
                            onClick={() => navigate(`/dashboard/project/${project.id}`)}
                            variant="light"
                          >
                            <AiOutlineEye />
                          </ActionIcon>
                          <ActionIcon
                            onClick={() => navigate(`/dashboard/project/${project.id}/settings`)}
                            variant="light"
                          >
                            <AiOutlineSetting />
                          </ActionIcon>
                        </Group>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <Stack align="center" py="xl">
                <Text color="dimmed">No projects yet</Text>
                <Button onClick={handleCreateProject}>
                  Create your first project
                </Button>
              </Stack>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

export default DashboardPage;