import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Container, Title, Text } from '@mantine/core';
import { apiClient } from '../utils/api';
import { Head } from '../components/Head';

function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: project } = useQuery(
    ['project', projectId],
    async () => {
      const response = await apiClient.get(`/project/${projectId}`);
      return response.data.data;
    },
    {
      enabled: !!projectId
    }
  );

  if (!project) {
    return <div>Loading...</div>;
  }

  return (
    <Container size="lg" py="md">
      <Head title={`${project.title} - Cusdis`} />
      
      <Title order={2}>{project.title}</Title>
      <Text color="dimmed">Project comments and management</Text>
      
      {/* Add comment management UI here */}
    </Container>
  );
}

export default ProjectPage;