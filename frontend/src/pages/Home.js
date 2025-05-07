import React from "react";
import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

function Home() {
  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Typography>
          <Title level={2}>Welcome to World Chase Tag Statistics</Title>
          <Paragraph>
            This application tracks and visualizes statistics for World Chase Tag matches, 
            providing insights into player performance in both team and 1v1 formats.
          </Paragraph>
          <Paragraph>
            World Chase Tag is a competitive sport combining elements of tag and parkour, 
            where athletes compete in a quad arena with obstacles. Players take turns being 
            either chasers attempting to tag opponents, or evaders trying to avoid being tagged.
          </Paragraph>
          <Title level={4}>Features:</Title>
          <ul>
            <li>Comprehensive player statistics</li>
            <li>Detailed player performance metrics</li>
            <li>Head-to-head comparisons</li>
            <li>Tag location visualization</li>
            <li>Match outcome tracking</li>
          </ul>
          <Paragraph>
            Navigate through the dashboard tabs to explore different aspects of player and match data.
          </Paragraph>
        </Typography>
      </Card>
    </div>
  );
}

export default Home; 