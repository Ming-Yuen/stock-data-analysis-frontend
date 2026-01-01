import React from "react";
import {
  TableRow,
  TableCell,
  Box,
  Typography,
  Button,
  CircularProgress,
} from "@mui/material";
import { Add } from "@mui/icons-material";

export interface TableFooterProps {
  colSpan: number;
  isExternal: boolean;
  enableInfiniteScroll: boolean;
  hasMore: boolean;
  isLoading: boolean;
  onAddRow?: () => void;
}

export const TableFooter: React.FC<TableFooterProps> = ({
  colSpan,
  isExternal,
  enableInfiniteScroll,
  hasMore,
  isLoading,
  onAddRow,
}) => {
  return (
    <>
      {enableInfiniteScroll && hasMore && (
        <TableRow>
          <TableCell colSpan={colSpan} align="center">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: 2,
              }}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  <Typography variant="body2">載入中...</Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  滾動加載更多
                </Typography>
              )}
            </Box>
          </TableCell>
        </TableRow>
      )}

      {!isExternal && (
        <TableRow>
          <TableCell colSpan={colSpan} align="center">
            <Button
              startIcon={<Add />}
              onClick={onAddRow}
              variant="outlined"
              size="small"
            >
              新增列
            </Button>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};
